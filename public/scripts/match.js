let matchNumber = Number(window.location.pathname.split('/')[2]);
document.title = `Match ${matchNumber} - Eastbots Scouting`;

navigator.serviceWorker.ready.then(registration => fetch('/api/match/' + matchNumber).then(response => {
	return response.json();
}).then(match => {
    function syncMatchAttribute(alliance, team, stat, value) {
        let message = {
            'match': matchNumber,
            'alliance': alliance,
            'team': team,
            'stat': stat,
            'value': value
        };
        store.changes('readwrite').then(changes => {
            changes.put(message);
            registration.sync.register('sync-match-attribute');
        });
    }

    function connect() {
        let connection = new WebSocket(`ws${window.location.protocol === 'https:' ? 's' : ''}://${window.location.host}`);

        connection.onopen = () => {};

        connection.onerror = (error) => {};

        connection.onmessage = (event) => {
            let data = JSON.parse(event.data);
            if(data.match !== matchNumber) return;
            let value = document.getElementById('team' + data.team + data.stat);
            if(value.checked !== undefined) {
                value.checked = data.value;
            } else if(value.value !== undefined) {
                value.value = data.value;
            } else {
                value.innerText = data.value;
            }
        };
    }

    connect();
    /*document.body.addEventListener('click', (event) => {
        if(event.target !== document.body) return;
        Array.from(document.getElementsByClassName('wrapper')).forEach((box) => box.removeAttribute('target'));
    });*/

    function generateInputs(team, alliance) {
        let wrapper = document.createElement('div');
        let table = document.createElement('div');
        let inputs = document.createElement('div');
        wrapper.className = alliance + ' wrapper mb-1';
        wrapper.innerHTML = '<h3><a href="/team/' + team.number + '">' + team.number + '</a></h3>';
        table.className = 'container-fluid';
        inputs.className = 'row m-0';
        for(const stat in team.stats) {
            let container = document.createElement('div');
            container.className = 'cell col-6 col-md-4 col-lg-3 p-0';
            container.innerHTML = stat + '<br>';
            if(team.stats[stat] === true || team.stats[stat] === false) {
                let input = document.createElement('input');
                input.id = 'team' + team.number + stat;
                input.type = 'checkbox';
                input.checked = team.stats[stat];
                input.addEventListener('change', (event) => {
                    syncMatchAttribute(alliance, team.number, stat, input.checked);
                });
                container.appendChild(input);
            } else if(typeof team.stats[stat] !== 'string') {
                let value = document.createElement('span');
                value.id = 'team' + team.number + stat;
                value.innerText = team.stats[stat];
                let increaseButton = document.createElement('button');
                increaseButton.className = 'increase';
                increaseButton.innerText = '+';
                increaseButton.addEventListener('click', (event) => {
                    value.innerText = Math.max(0, Number(value.innerText) + 1);
                    syncMatchAttribute(alliance, team.number, stat, Number(value.innerText));
                });
                let decreaseButton = document.createElement('button');
                decreaseButton.className = 'decrease';
                decreaseButton.innerText = '-';
                decreaseButton.addEventListener('click', (event) => {
                    value.innerText = Math.max(0, Number(value.innerText) - 1);
                    syncMatchAttribute(alliance, team.number, stat, Number(value.innerText));
                });
                container.appendChild(value);
                container.appendChild(increaseButton);
                container.appendChild(decreaseButton);
            } else {
                let lastChange = Date.now();
                let input = document.createElement('textarea');
                input.id = 'team' + team.number + stat;
                input.className = 'input';
                input.value = team.stats[stat];
                input.addEventListener('keyup', (event) => {
                    setTimeout(() => {
                        if(Date.now() - lastChange > 1000) {
                            lastChange = Date.now();
                            syncMatchAttribute(alliance, team.number, stat, input.value);
                        }
                    }, 1000);
                });
                container.appendChild(input);
            }
            inputs.appendChild(container);
        }
        table.appendChild(inputs);
        wrapper.appendChild(table);
        /*wrapper.addEventListener('click', (event) => {
            Array.from(document.getElementsByClassName('wrapper')).forEach((box) => box.removeAttribute('target'));
            wrapper.setAttribute('target', true);
        });*/
        document.getElementById(alliance).appendChild(wrapper);
    }

    match.red.forEach(team => generateInputs(team, 'red'));
    match.blue.forEach(team => generateInputs(team, 'blue'));
}));