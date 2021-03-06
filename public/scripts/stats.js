let teams = [];
let attributes = [];
let csv = '';

function display() {
    document.getElementById('teams-body').innerHTML = '';
    
    teams.forEach(team => {
        let values = document.createElement('tr');
        values.innerHTML = '<td><a href="/team/' + team.number + '"><b>' + team.number + '</b></a></td>';
        for(const stat in team.stats) {
            let value = document.createElement('td');
            value.className = 'stat';
            if(typeof team.stats[stat] === 'object') {
                for(const option in team.stats[stat]) value.innerHTML += option + ': ' + team.stats[stat][option] + '<br>';
            } else {
                value.innerText += team.stats[stat];
            }
            if(typeof team.stats[stat] === 'object') {
                for(const option in team.stats[stat]) if(!attributes.includes(stat + ' ' + option)) attributes.push(stat + ' ' + option);
            } else {
                if(!attributes.includes(stat) && (!isNaN(team.stats[stat]) && team.stats[stat] !== '')) attributes.push(stat);
            }
            values.appendChild(value);
        }
        document.getElementById('teams-body').appendChild(values);
    });
}

function sort() {
    let order = document.getElementById('order').value;
    let attribute = document.getElementById('attribute').value;
    if(order === 'least') {
        teams = teams.sort((a, b) => {
            if(attribute.includes(' ')) return (a.stats[attribute.split(' ')[0]][attribute.split(' ')[1]] || 0) - (b.stats[attribute.split(' ')[0]][attribute.split(' ')[1]] || 0);
            return a.stats[attribute] - b.stats[attribute];
        });
    } else {
        teams = teams.sort((a, b) => {
            if(attribute.includes(' ')) return (b.stats[attribute.split(' ')[0]][attribute.split(' ')[1]] || 0) - (a.stats[attribute.split(' ')[0]][attribute.split(' ')[1]] || 0);
            return b.stats[attribute] - a.stats[attribute];
        });
    }
}

fetch('/api/teams').then(response => {
	return response.json();
}).then(data => {
    teams = data;
    teams = teams.sort((a, b) => {
        return a.number - b.number;
    });
    csv = 'team,' + Object.keys(teams[0].stats).join(',') + '\n' + teams.map(team => {
        let stats = [];
        for(const stat in team.stats) stats.push(JSON.stringify(team.stats[stat]).replace(/\n/g, ' '));
        return team.number + ',' + stats.join(',');
    }).join('\n');

    let header = document.createElement('tr');
    header.innerHTML = '<th>Team</th>';
    attributes = [];
    for(const stat in teams[0].stats) {
        let label = document.createElement('th');
        label.innerText = stat;
        header.appendChild(label);
    }
    document.getElementById('teams-head').appendChild(header);

    display();

    attributes.forEach(attribute => {
        let option = document.createElement('option');
        option.value = attribute;
        option.innerText = attribute;
        document.getElementById('attribute').appendChild(option);
    });

    document.getElementById('sort').addEventListener('click', (event) => {
        sort();
        display();
    });

    document.getElementById('reset').addEventListener('click', (event) => {
        teams = teams.sort((a, b) => {
            return a.number - b.number;
        });
        display();
    });

    document.getElementById('download').addEventListener('click', (event) => {
        let fileBlob = new Blob([csv]);
        let link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(fileBlob));
        link.setAttribute('download', 'data.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});