fetch('/api/team/' + window.location.pathname.split('/')[2]).then(response => {
	return response.json();
}).then(team => {
    document.title = `Team ${team.team_number} - Eastbots Scouting`;
	document.getElementById('name').innerText = team.team_number + ' - ' + team.nickname;
	let overall = document.createElement('div');
    for(const stat in team.stats) {
        let value = document.createElement('div');
        value.className = 'stat';
        value.innerHTML = '<b>' + stat + '</b><br>';
        if(typeof team.stats[stat] === 'object') {
            for(const option in team.stats[stat]) value.innerHTML += option + ': ' + team.stats[stat][option] + ' ';
        } else {
            value.innerHTML += team.stats[stat];
        }
        overall.appendChild(value);
    }
    let table = document.createElement('table');
    let header = document.createElement('tr');
    header.className = 'header';
    header.innerHTML = '<td>Match</td>';
    for(const stat in team.stats) {
    	let label = document.createElement('td');
        label.innerText = stat;
        header.appendChild(label);
    }
    table.appendChild(header);
    team.matches.forEach(match => {
    	let values = document.createElement('tr');
    	values.innerHTML = '<td><a href="/match/' + (match.matchNumber) + '">' + (match.matchNumber) + '</td>';
    	for(const stat in match.stats) if(team.stats[stat] !== undefined) {
	    	let value = document.createElement('td');
	        value.innerText = match.stats[stat];
	        values.appendChild(value);
	    }
	    table.appendChild(values);
    });
    document.getElementById('totals').appendChild(overall);
    document.getElementById('info').appendChild(table);
    if(team.additionalData) {
        let title = document.createElement('h2');
        title.innerText = 'Addition Data';
        document.getElementById('info').appendChild(title);
        let table = document.createElement('table');
        let header = document.createElement('tr');
        header.className = 'header';
        table.appendChild(header);
        let values = document.createElement('tr');
        for(const stat in team.additionalData) {
            let label = document.createElement('td');
            label.innerText = stat;
            header.appendChild(label);
            if(typeof team.additionalData[stat] === 'string' && team.additionalData[stat].match(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i)) {
                let value = document.createElement('td');
                value.style.overflow = 'scroll';
                let image = document.createElement('img');
                image.src = team.additionalData[stat];
                value.appendChild(image);
                values.appendChild(value);
            } else {
                let value = document.createElement('td');
                value.innerText = team.additionalData[stat];
                values.appendChild(value);
            }
        }
        table.appendChild(values);
        document.getElementById('info').appendChild(table);
    }
});