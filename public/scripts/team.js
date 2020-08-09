fetch('/api/team/' + window.location.pathname.split('/')[2]).then(response => {
	return response.json();
}).then(team => {
    document.title = `Team ${team.number} - Eastbots Scouting`;
	document.getElementById('name').innerText = team.number + ' - ' + team.name;

    for(const stat in team.stats) {
        let value = document.createElement('div');
        value.className = 'stat col-6 col-sm-4 col-md-3 col-lg-2 p-0';
        value.innerHTML = '<b>' + stat + '</b><br>';
        if(typeof team.stats[stat] === 'object') {
            for(const option in team.stats[stat]) value.innerHTML += option + ': ' + team.stats[stat][option] + ' ';
        } else {
            value.innerHTML += team.stats[stat];
        }
        document.getElementById('totals').appendChild(value);
    }

    let header = document.createElement('tr');
    header.innerHTML = '<th>Match</th>';
    for(const stat in team.stats) {
    	let label = document.createElement('th');
        label.innerText = stat;
        header.appendChild(label);
    }
    document.getElementById('matches-head').appendChild(header);
    
    team.matches.forEach(match => {
    	let values = document.createElement('tr');
    	values.innerHTML = '<td><a href="/match/' + match.matchNumber + '">' + match.matchNumber + '</td>';
    	for(const stat in match.stats) if(team.stats[stat] !== undefined) {
	    	let value = document.createElement('td');
	        value.innerText = match.stats[stat];
	        values.appendChild(value);
	    }
	    document.getElementById('matches-body').appendChild(values);
    });

    // if(team.additionalData) {
    //     let title = document.createElement('h2');
    //     title.innerText = 'Addition Data';
    //     document.getElementById('info').appendChild(title);
    //     let table = document.createElement('table');
    //     let header = document.createElement('tr');
    //     header.className = 'header';
    //     table.appendChild(header);
    //     let values = document.createElement('tr');
    //     for(const stat in team.additionalData) {
    //         let label = document.createElement('td');
    //         label.innerText = stat;
    //         header.appendChild(label);
    //         if(typeof team.additionalData[stat] === 'string' && team.additionalData[stat].match(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i)) {
    //             let value = document.createElement('td');
    //             value.style.overflow = 'scroll';
    //             let image = document.createElement('img');
    //             image.src = team.additionalData[stat];
    //             value.appendChild(image);
    //             values.appendChild(value);
    //         } else {
    //             let value = document.createElement('td');
    //             value.innerText = team.additionalData[stat];
    //             values.appendChild(value);
    //         }
    //     }
    //     table.appendChild(values);
    //     document.getElementById('info').appendChild(table);
    // }
});