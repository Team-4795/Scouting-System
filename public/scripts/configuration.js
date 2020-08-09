document.getElementById('add-match').addEventListener('click', async () => {
	let matchNumber = document.getElementById('match-number').value;
	let red = document.getElementById('red-alliance').value;
	let blue = document.getElementById('blue-alliance').value;
	// Error handling
	matchNumber = Number(matchNumber);
	red = red.replace(/\s/g, '').split(',').map(number => Number(number));
	blue = blue.replace(/\s/g, '').split(',').map(number => Number(number));

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
});