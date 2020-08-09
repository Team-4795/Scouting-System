const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
// const WebSocket = require('ws');
// Uninstall
// const session = require('express-session');
// const MemoryStore = require('memorystore')(session);
const database = require('./data/database.json');
const config = require('./config.json');
// Run getData
// Login link in navbar if viewer password not set
// Set passwords and keys in env file
// Verify that passwords are strings and not empty
if(config.viewerPassword === undefined) throw new Error('An viewer password must be provided');
if(config.scoutPassword === undefined) throw new Error('An scout password must be provided');
if(config.adminPassword === undefined) throw new Error('An admin password must be provided');
if(config.jwtKey === undefined) {
	// Use admin password, would sign everyone out
	config.jwtKey = crypto.randomBytes(64).toString('hex');
	fs.writeFileSync('./config.json', JSON.stringify(config, null, '\t'));
}

function createMatch(match) {
	database.matches.push({
		'number': match.number,
		'red': match.red.map(number => ({
			number,
			'stats': config.defaultStats
		})),
		'blue': match.blue.map(number => ({
			number,
			'stats': config.defaultStats
		}))
	});
	database.matches = database.matches.sort((a, b) => a.number - b.number);
	stringifedMatches = JSON.stringify(database.matches);
	fs.writeFile('data/database.json', JSON.stringify(database, null, '\t'), () => {});
}

let stringifedTeams = JSON.stringify(database.teams);
let stringifedMatches = JSON.stringify(database.matches);
let updated = false;

let server = http.createServer();
// Polling instead of websocket
// Authenticate with jwt, or remove entirely
// let websocket = new WebSocket.Server({server});

// websocket.on('connection', ws => {});

let app = express();

app.disable('x-powered-by');
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({
	'extended': true
}));
app.use(cookieParser());
app.use(express.static('public'));

app.post('/authenticate', (request, response) => {
	let session = {};
	let password = request.body.password;
	// if(config.viewerPassword === undefined || config.viewerPassword === '') {
	// 	session.authenticated = true;
	// 	session.accessLevel = 'viewer';
	// }
	if(password === config.viewerPassword || password === config.scoutPassword || password === config.adminPassword) session.authenticated = true;
	if(password === config.viewerPassword) session.accessLevel = 'viewer';
	if(password === config.scoutPassword) session.accessLevel = 'scout';
	if(password === config.adminPassword) session.accessLevel = 'admin';
	// Set cookie securely
	response.cookie('session', jwt.sign({
		'data': session,
	}, config.jwtKey, {
		'expiresIn': '7d'
	}), {
		'expires': new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
	});
	response.redirect(request.get('Referrer'));
});

app.use((request, response, next) => {
	let token = request.cookies.session;
	jwt.verify(token, config.jwtKey, (error, session) => {
		if(error) return response.render('pages/authenticate');
		response.cookie('session', jwt.sign({
			'data': session.data
		}, config.jwtKey, {
			'expiresIn': '7d'
		}), {
			'expires': new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
		});
		request.session = session.data;
		if(request.session.authenticated) {
			next();
		} else {
			response.render('pages/authenticate');
		}
	});
});

app.get('/', (request, response) => {
    response.render('pages/index', {
    	'session': request.session
    });
});

app.get(['/match', '/match/:number'], (request, response) => {
    response.render('pages/match', {
    	'session': request.session
    });
});

app.get(['/team', '/team/:number'], (request, response) => {
    response.render('pages/team', {
    	'session': request.session
    });
});

app.get('/stats', (request, response) => {
	response.render('pages/stats', {
    	'session': request.session
    });
});

app.get('/data-sharing', (request, response) => {
	response.render('pages/data-sharing', {
    	'session': request.session
    });
});

app.get('/configuration', (request, response) => {
	response.render('pages/configuration', {
    	'session': request.session
    });
});

app.post('/api/*', (request, response, next) => {
	if(request.session.accessLevel === 'viewer') return response.status(403).json({
		'error': 'Access denied'
	});
	next();
});

app.get('/api/team-number', (request, response) => {
    response.json(config.teamNumber);
});

app.get('/api/default-stats', (request, response) => {
    response.json(config.defaultStats);
});

app.get('/api/stat-types', (request, response) => {
    response.json(config.statTypes);
});

app.get('/api/matches', (request, response) => {
	response.setHeader('Content-Type', 'application/json');
    response.send(stringifedMatches);
});

// app.post('/api/matches/create', (request, response) => {
// 	let data = request.body;
// 	let matchNumber = request.body.matchNumber;
// 	let redAlliance = request.body.redAlliance;
// 	let blueAlliance = request.body.blueAlliance;
// 	// Security checks
// 	matchNumber = Number(matchNumber);
// 	redAlliance = redAlliance.replace(/\s/g, '').split(',').map(number => ({
// 		'number': Number(number),
// 		'stats': JSON.parse(JSON.stringify(config.defaultStats))
// 	}));
// 	blueAlliance = blueAlliance.replace(/\s/g, '').split(',').map(number => ({
// 		'number': Number(number),
// 		'stats': JSON.parse(JSON.stringify(config.defaultStats))
// 	}));
// 	database.matches.push({
// 		'number': matchNumber,
// 		'red': redAlliance,
// 		'blue': blueAlliance
// 	});
// 	database.matches = database.matches.sort((a, b) => a.number - b.number);
// 	stringifedMatches = JSON.stringify(database.matches);
// 	fs.writeFile('data/database.json', JSON.stringify(database, null, '\t'), () => {});
// 	response.json({
// 		'result': 'success'
// 	});
// });

app.get('/api/match/:number', (request, response) => {
	// Security check
    response.json(database.matches.filter(match => match.number === Number(request.params.number))[0]);
});

app.get('/api/teams', (request, response) => {
	response.setHeader('Content-Type', 'application/json');
    response.send(stringifedTeams);
});

app.get('/api/team/:number', (request, response) => {
	let teamNumber = Number(request.params.number);
	if(isNaN(teamNumber)) return response.json({'error': 'Unknown team number'});
	let team = database.teams.filter(team => team.number === teamNumber)[0];
	if(team === undefined) return response.json({'error': 'Unknown team number'});
    response.json({
    	...team,
    	'matches': (() => {
    		let matches = [];
    		database.matches.forEach(match => {
    			match.red.forEach(team => {
    				if(team.number === teamNumber) matches.push({
    					'matchNumber': match.number,
    					'stats': team.stats
    				});
    			});
    			match.blue.forEach(team => {
    				if(team.number === teamNumber) if(team.number === teamNumber) matches.push({
    					'matchNumber': match.number,
    					'stats': team.stats
    				});
    			});
    		});
    		return matches;
    	})()
    });
});

app.post('/api/sync-change', (request, response) => {
	let data = request.body;
	// Create match function, call if unknown match requested
	// Use filter to select match
	if(data.type === 'match-attribute') {
		if(!isNaN(data.match) && database.matches[data.match - 1] !== undefined && database.matches[data.match - 1][data.alliance] !== undefined) {
			let team = database.matches[data.match - 1][data.alliance].filter((team) => team.number === data.team)[0];
			if(team === undefined) return response.json({
		    	'result': 'error'
		    });
			team.stats[data.stat] = data.value;
			updated = true;
			// let update = JSON.stringify({
			// 	'match': data.match,
			// 	'team': data.team,
			// 	'stat': data.stat,
			// 	'value': data.value
			// });
			// websocket.clients.forEach(client => {
			// 	// Don't send to the sending client
			// 	client.send(update);
			// });
		    response.json({
		    	'result': 'success'
		    });
		} else {
			response.json({
		    	'result': 'error'
		    });
		}
	} else if(data.type === 'match') {
		// Error checking
		createMatch(data);
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
    response.status(404).render('pages/not-found', {
    	'session': request.session
    });
});

app.use((error, request, response) => {
    response.status(500).render('pages/error', {
    	'session': request.session
    });
});

server.on('request', app);
server.listen(process.env.PORT || 80, () => {});

setInterval(() => {
	function updateTeam(team) {
		let main = database.teams.filter(number => number.number === team.number)[0];
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