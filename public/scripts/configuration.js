document.getElementById('add-match').addEventListener('click', async () => {
	let matchNumber = document.getElementById('match-number').value;
	let red = document.getElementById('red-alliance').value;
	let blue = document.getElementById('blue-alliance').value;
	// Error handling
	matchNumber = Number(matchNumber);
	red = red.replace(/\s/g, '').split(',').map(number => Number(number));
	blue = blue.replace(/\s/g, '').split(',').map(number => Number(number));
	// await fetch('/api/matches/create', {
	// 	'method': 'POST',
	// 	'body': JSON.stringify({matchNumber, redAlliance, blueAlliance}),
	// 	'headers': {
	// 		'Accept': 'application/json',
	// 		'Content-Type': 'application/json'
	// 	},
	// 	'credentials': 'same-origin'
	// });

	navigator.serviceWorker.ready.then(registration => store.changes('readwrite').then(changes => {
        changes.put({
        	'type': 'match',
        	'number': matchNumber,
        	red,
        	blue,
            'time': new Date().getTime()
        });
        registration.sync.register('sync-data');
        document.getElementById('result-title').innerText = 'Match Added';
        document.getElementById('result-message').innerText = `Match ${matchNumber} successfully added!`;
        $('#result-modal').modal();
        document.getElementById('match-number').value = '';
        document.getElementById('red-alliance').value = '';
        document.getElementById('blue-alliance').value = '';
    }));
	// window.location.reload();
});

// fetch('/api/matches').then(response => {
// 	return response.json();
// }).then(matches => {
// 	function createTeamInputs(alliance) {
// 		let wrapper = document.createElement('div');
// 		for(let i = 0; i < 3; i++) {
// 			let input = document.createElement('input');
// 			wrapper.appendChild(input);
// 		}
// 		return wrapper;
// 	}

// 	function createMatch(match) {
// 		let wrapper = document.createElement('div');
// 		wrapper.className = 'match mb-1';
// 		wrapper.appendChild(createTeamInputs('red'));
// 		wrapper.appendChild(createTeamInputs('blue'));
// 		document.getElementById('matches').appendChild(wrapper);
// 	}

// 	matches.forEach(createMatch);
// });