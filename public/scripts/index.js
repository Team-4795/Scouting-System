function createMatchLink(match, teamNumber, row) {
    let link = document.createElement('a');
    link.className = 'col-lg p-0 ' + (match.red.filter(team => team.number === teamNumber).length > 0 || match.blue.filter(team => team.number === teamNumber).length > 0 ? 'own ' : '') + 'match';
    link.href = '/match/' + match.number;
    link.innerHTML = '<span>Match ' + match.number + '</span>';
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
    row.appendChild(link);
}

fetch('/api/matches').then(response => {
	return response.json();
}).then(async matches => {
    let teamNumber = await fetch('/api/team-number');
    teamNumber = await teamNumber.json();
    for(let i = 0; i < matches.length; i += 2) {
        let row = document.createElement('div');
        row.className = 'row m-0';
        createMatchLink(matches[i], teamNumber, row);
        if(matches[i + 1] !== undefined) {
            createMatchLink(matches[i + 1], teamNumber, row);
        } else {
            let empty = document.createElement('div');
            empty.className = 'col-lg p-0';
            row.appendChild(empty);
        }
        document.getElementById('matches').appendChild(row);
    }
});