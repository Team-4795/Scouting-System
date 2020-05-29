const fs = require('fs');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const database = require('./data/database.json');
const config = require('./config.json');

let stringifedTeams = JSON.stringify(database.teams);
let stringifedMatches = JSON.stringify(database.matches);
let updated = false;

let app = express();
app.set('view engine', 'ejs');

let server = http.createServer();
let websocket = new WebSocket.Server({server});

websocket.on('connection', ws => {});

app.use(session({
	'cookie': {
		'secure': 'auto',
		'maxAge': 1000 * 60 * 60 * 24 * 10
	},
	'store': new MemoryStore({
		'checkPeriod': 1000 * 60 * 10
	}),
	'secret': 'eastbots',
	'name': 'session',
	'rolling': true,
	'saveUninitialized': false,
	'resave': true
}));

app.use(express.json());
app.use(express.urlencoded({
	'extended': true
}));

app.use(express.static('public'));

app.post('/authenticate', (request, response) => {
	if(request.body.password === config.password) request.session.authenticated = true;
	response.redirect(request.get('Referrer'));
});

app.use((request, response, next) => {
	if(request.session.authenticated || config.password === undefined && config.password !== '') {
		next();
	} else {
		response.render('pages/authenticate');
	}
});

app.get('/', (request, response) => {
    response.render('pages/index');
});

app.get(['/match', '/match/:number'], (request, response) => {
    response.render('pages/match');
});

app.get(['/team', '/team/:number'], (request, response) => {
    response.render('pages/team');
});

app.get('/stats', (request, response) => {
	response.render('pages/stats');
});

app.get('/offline', (request, response) => {
	response.render('pages/offline');
});

app.get('/api/team-number', (request, response) => {
    response.json(config.teamNumber);
});

app.get('/api/matches', (request, response) => {
	response.setHeader('Content-Type', 'application/json');
    response.send(stringifedMatches);
});

app.get('/api/match/:number', (request, response) => {
    response.json(database.matches[Number(request.params.number) - 1]);
});

app.get('/api/teams', (request, response) => {
	response.setHeader('Content-Type', 'application/json');
    response.send(stringifedTeams);
});

app.get('/api/team/:number', (request, response) => {
	let teamNumber = Number(request.params.number);
	if(isNaN(teamNumber)) return response.json({'error': 'Unknown team number'});
	let team = database.teams.filter(team => team.team_number === teamNumber)[0];
	if(team === undefined) return response.json({'error': 'Unknown team number'});
    response.json({
    	...team,
    	'matches': (() => {
    		let matches = [];
    		database.matches.forEach(match => {
    			match.red.forEach(team => {
    				if(team.number === teamNumber) matches.push({
    					'matchNumber': match.match_number,
    					'stats': team.stats
    				});
    			});
    			match.blue.forEach(team => {
    				if(team.number === teamNumber) if(team.number === teamNumber) matches.push({
    					'matchNumber': match.match_number,
    					'stats': team.stats
    				});
    			});
    		});
    		return matches;
    	})()
    });
});

app.post('/api/update-match-attribute', (request, response) => {
	let data = request.body;
	if(!isNaN(data.match) && database.matches[data.match - 1] !== undefined && database.matches[data.match - 1][data.alliance] !== undefined) {
		let team = database.matches[data.match - 1][data.alliance].filter((team) => team.number === data.team)[0];
		if(team === undefined) return response.json({
	    	'result': 'error'
	    });
		team.stats[data.stat] = data.value;
		updated = true;
		let update = JSON.stringify({
			'match': data.match,
			'team': data.team,
			'stat': data.stat,
			'value': data.value
		});
		websocket.clients.forEach(client => {
			// Typing may be an issue
			client.send(update);
		});
	    response.json({
	    	'result': 'success'
	    });
	} else {
		response.json({
	    	'result': 'error'
	    });
	}
});

app.use((request, response) => {
    response.status(404).render('pages/404');
});

server.on('request', app);
server.listen(process.env.PORT || 80, () => {});

setInterval(() => {
	function updateTeam(team) {
		let main = database.teams.filter(number => number.team_number === team.number)[0];
		if(!team.stats.disabled) main.enabledMatches = (main.enabledMatches || 0) + 1;
		for(const stat in team.stats) {
			if(team.stats[stat] === true) {
				if(main.stats[stat] === false) main.stats[stat] = 0;
				main.stats[stat]++;
			} else if(config.statTypes[stat] === 'total') {
				main.stats[stat] += team.stats[stat] + (config.defaultStats[stat] === '' ? (team.stats[stat] !== '' ? '\n' : '') : 0);
			} else if(config.statTypes[stat] === 'average') {
				if(!team.stats.disabled) main.stats[stat] += team.stats[stat];
			}
			if(config.statTypes[stat] === 'multiple') {
				if(typeof main.stats[stat] !== 'object') {
					main.stats[stat] = {};
				}
				if(main.stats[stat][team.stats[stat]] === undefined) { 
					main.stats[stat][team.stats[stat]] = 1;
				} else {
					main.stats[stat][team.stats[stat]]++;
				}
			}
		}
	}

	function calculateAverages(team) {
		for(const stat in team.stats) {
			if(config.statTypes[stat] === 'average') team.stats[stat] /= team.enabledMatches;
		}
	}

	if(updated) {
		updated = false;
		database.teams = database.teams.map(team => {
			team.stats = (() => {
	            let stats = {};
	            for(const stat in config.defaultStats) if(config.statTypes[stat] !== 'matchOnly') stats[stat] = config.defaultStats[stat];
	            return stats;
	        })();
			team.enabledMatches = 0;
			return team;
		});
		database.matches.forEach(match => {
			match.red.forEach(team => updateTeam(team));
			match.blue.forEach(team => updateTeam(team));
		});
		database.teams.forEach(team => calculateAverages(team));
		stringifedTeams = JSON.stringify(database.teams);
		stringifedMatches = JSON.stringify(database.matches);
		fs.writeFile('data/database.json', JSON.stringify(database, null, '\t'), () => {});
	}
}, 10000);