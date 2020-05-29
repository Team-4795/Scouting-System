fetch('/api/matches').then(response => {
	return response.json();
}).then(async matches => {
    let teamNumber = await fetch('/api/team-number');
    teamNumber = await teamNumber.json();
    matches.forEach(match => {
        let link = document.createElement('a');
        link.className = (match.red.filter(team => team.number === teamNumber).length > 0 || match.blue.filter(team => team.number === teamNumber).length > 0 ? 'own ' : '') + 'match';
        link.href = '/match/' + match.match_number;
        link.innerText = 'Match ' + match.match_number;
        match.red.forEach(team => {
            let box = document.createElement('div');
            box.className = 'red team';
            box.innerText = team.number;
            link.appendChild(box);
        });
        match.blue.forEach(team => {
            let box = document.createElement('div');
            box.className = 'blue team';
            box.innerText = team.number;
            link.appendChild(box);
        });
        document.getElementById('matches').appendChild(link);
    });
});