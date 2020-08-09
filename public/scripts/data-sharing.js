QrScanner.WORKER_PATH = 'scripts/qr-scanner-worker.js';

function chunk(array, size) {
	if(!array.length) return [];
	const head = array.slice(0, size);
	const tail = array.slice(size);

	return [head, ...chunk(tail, size)];
}

let lastCode = '';
// Show message indicating scan
const scanner = new QrScanner(document.getElementById('video-stream'), async code => {
	if(code === lastCode) return;
	lastCode = code;
	code = JSON.parse(code);

	$('#scanning-toast').toast('show');

	if(code.type === 'teams') {

	} else if(code.type === 'matches') {
		for(let match of code.data) {
			match = {
				'type': 'match',
				'number': match[0],
				'red': match[1],
				'blue': match[2],
            	'time': new Date().getTime()
			};
			navigator.serviceWorker.ready.then(registration => store.changes('readwrite').then(changes => {
		        changes.put(match);
		        registration.sync.register('sync-data');
		    }));
			// await fetch('/api/matches/set', {
			// 	'method': 'POST',
			// 	'body': JSON.stringify(match),
			// 	'headers': {
			// 		'Accept': 'application/json',
			// 		'Content-Type': 'application/json'
			// 	},
			// 	'credentials': 'same-origin'
			// });
		}
	} else if(code.type === 'changes') {
		navigator.serviceWorker.ready.then(registration => store.changes('readwrite').then(changes => {
            for(let change of code.data) {
				change = {
					'match': change[0],
					'alliance': change[1],
					'team': change[2],
					'stat': change[3],
					'value': change[4],
					'time': change[5]
				};
				changes.put(change);
			}
            registration.sync.register('sync-data');
        }));
	}
});
// Stop button or disable scan button once used
document.getElementById('scan').addEventListener('click', () => scanner.start());

document.getElementById('share').addEventListener('click', async () => {
	$('#sharing-toast').toast('hide');
	document.getElementById('share').disabled = true;
	document.getElementById('progress-wrapper').hidden = null;
	let type = document.getElementById('data-type').value;
	let data = [];
	if(type === 'teams') {
		data = chunk((await (await fetch('/api/teams')).json()).map(team => [
			team.number,
			team.city,
			team.state,
			team.country,
			team.name
		]), 2);
	} else if(type === 'matches') {
		data = chunk((await (await fetch('/api/matches')).json()).map(match => [
			match.number,
			match.red.map(team => team.number),
			match.blue.map(team => team.number)
		]), 3);
	} else if(type === 'changes') {
		// Call change API to clear redundant changes
		await fetch('/api/teams');
		data = chunk((await (await store.changes('readwrite')).getAll()).filter(change => change.type === 'match-attribute').map(change => [
			change.match,
			change.alliance,
			change.team,
			change.stat,
			change.value,
			change.time
		]), 2);
	}
	for(let i = 0; i < data.length; i++) {
		let qr = new QRious({
			'value': JSON.stringify({
				type,
				'data': data[i]
			}),
			'size': 400,
			'padding': 50
		});
		document.getElementById('qr-code').src = qr.toDataURL();
		document.getElementById('progress').style.width = i / (data.length - 1) * 100 + '%';
		await new Promise((resolve, reject) => setTimeout(resolve, 3500));
	}
	$('#sharing-toast').toast('show');
	document.getElementById('qr-code').src = '';
	document.getElementById('progress-wrapper').hidden = true;
	document.getElementById('share').disabled = null;
});