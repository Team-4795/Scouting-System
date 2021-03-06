self.importScripts('/scripts/idb.js');
self.importScripts('/scripts/store.js');

let cacheName = 'offline-cache';
let filesToCache = [
	'/',
	'/stats',
	'/match',
	'/team',
	'/data-sharing',
	'/configuration',
	'/api/team-number',
	'/api/default-stats',
	'/api/stat-types',
	'/api/matches',
	'/api/teams',
	'scripts/idb.js',
	'scripts/store.js',
	'scripts/index.js',
	'scripts/match.js',
	'scripts/stats.js',
	'scripts/team.js',
	'scripts/data-sharing.js',
	'scripts/configuration.js',
	'scripts/jquery-slim.js',
	'scripts/bootstrap.js',
	'scripts/qrious.js',
	'scripts/qr-scanner.js',
	'scripts/qr-scanner-worker.js',
	'styles/main.css',
	'styles/index.css',
	'styles/match.css',
	'styles/stats.css',
	'styles/team.css',	
	'styles/data-sharing.css',
	'styles/configuration.css',
	'styles/bootstrap.css',
	'/images/logo.png'
];

function getJSON(responsePromise) {
	return responsePromise.then(response => response.json());
}

async function filterChanges() {
	let db = await store.changes('readwrite');
	let changes = await db.getAll();
	let map = {};
	let newChanges = [];
	changes.sort((a, b) => a.time - b.time).forEach(change => {
		if(change.type === 'match-attribute') {
			let id = change.match + change.alliance + change.team + change.stat;
			if(map[id]) db.delete(map[id].id);
			map[id] = change;
		} else {
			map[change.number] = change;
		}
	});
	for(const change in map) newChanges.push(map[change]);
	return newChanges;
}

async function getMatches() {
	let matches = await getJSON(caches.match('/api/matches'));
	let changes = await filterChanges();
	changes = changes.filter(change => change.type === 'match');
	for(const change of changes) {
		let defaultStats = await getJSON(caches.match('/api/default-stats'));
		let match = {
			'number': change.number,
			'red': change.red.map(number => ({
				number,
				'stats': defaultStats
			})),
			'blue': change.blue.map(number => ({
				number,
				'stats': defaultStats
			}))
		};
		matches.push(match);
	}
	return matches.sort((a, b) => a.number - b.number);
}

function syncData() {
	return filterChanges().then(changes => Promise.all(changes.map(change => {
		return fetch('/api/sync-change', {
			'method': 'POST',
			'body': JSON.stringify(change),
			'headers': {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			'credentials': 'same-origin'
		}).then(response => response.json()).then(data => {
			if(data.result === 'success') return store.changes('readwrite').then(changes => changes.delete(change.id));
		});
	})));
}

async function calculateStats() {
    let matches = await getMatches();
	let changes = await filterChanges();
    for(let change of changes) if(change.type === 'match-attribute') {
    	let matchIndex = matches.map(match => match.number).indexOf(change.match);
    	matches[matchIndex][change.alliance][matches[matchIndex][change.alliance].map(team => team.number).indexOf(change.team)].stats[change.stat] = change.value;
    }
    let teams = await getJSON(caches.match('/api/teams'));
	let defaultStats = await getJSON(caches.match('/api/default-stats'));
	let statTypes = await getJSON(caches.match('/api/stat-types'));

	function updateTeam(team) {
		let main = teams.filter(number => number.number === team.number)[0];
		if(!team.stats.disabled) main.enabledMatches = (main.enabledMatches || 0) + 1;
		for(const stat in team.stats) {
			if(team.stats[stat] === true) {
				if(main.stats[stat] === false) main.stats[stat] = 0;
				main.stats[stat]++;
			} else if(statTypes[stat] === 'total') {
				main.stats[stat] += team.stats[stat] + (defaultStats[stat] === '' ? (team.stats[stat] !== '' ? '\n' : '') : 0);
			} else if(statTypes[stat] === 'average') {
				if(!team.stats.disabled) main.stats[stat] += team.stats[stat];
			}
			if(statTypes[stat] === 'multiple') {
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
			if(statTypes[stat] === 'average') team.stats[stat] /= team.enabledMatches;
		}
	}

	teams = teams.map(team => {
		team.stats = (() => {
            let stats = {};
            for(const stat in defaultStats) if(statTypes[stat] !== 'matchOnly') stats[stat] = defaultStats[stat];
            return stats;
        })();
		team.enabledMatches = 0;
		return team;
	});
	matches.forEach(match => {
		match.red.forEach(team => updateTeam(team));
		match.blue.forEach(team => updateTeam(team));
	});
	teams.forEach(team => calculateAverages(team));
	let teamsCache = new Response(JSON.stringify(teams), {
        'headers': {
            'Content-Type': 'application/json'
        }
    });
	return caches.open(cacheName).then(cache => cache.put('/api/teams', teamsCache));
}

self.addEventListener('install', event => {
	caches.delete(cacheName);
	event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(filesToCache)));
	return self.skipWaiting();
});

self.addEventListener('activate', event => {
	event.waitUntil(caches.keys().then(keyList => Promise.all(keyList.map(key => {
		if(key !== cacheName) return caches.delete(key);
	}))));
	return self.clients.claim();
});
// Use comparison instead of includes
// Check request types for GET and POST
self.addEventListener('fetch', event => {	
	if(event.request.url.includes('/api/matches')) return event.respondWith((async () => {
	    let matches = await fetch(event.request, {
	    	'credentials': 'same-origin'
	    }).catch(error => null);
	    if(matches !== null) {
	    	await caches.open(cacheName).then(cache => cache.put('/api/matches', matches.clone()));
	    	return matches;
	    }

	    matches = await getMatches();

	    return new Response(JSON.stringify(matches), {
	        'headers': {
	            'Content-Type': 'application/json'
	        }
	    });
	})());

	if(event.request.url.includes('/api/match/')) return event.respondWith((async () => {
	    let match = await fetch(event.request, {
	    	'credentials': 'same-origin'
	    }).catch(error => null);
	    if(match !== null) return match;

	    let matches = await getMatches();
	    let matchNumber = Number(event.request.url.split('/').slice(-1));
	    // Security check
	    match = matches.filter(match => match.number === matchNumber)[0];
	    let changes = await filterChanges();

	    for(let change of changes) if(change.type === 'match-attribute') {
	    	if(change.match === matchNumber) {
	    		match[change.alliance][match[change.alliance].map(team => team.number).indexOf(change.team)].stats[change.stat] = change.value;
	    	}
	    }

	    return new Response(JSON.stringify(match), {
	        'headers': {
	            'Content-Type': 'application/json'
	        }
	    });
	})());
	// caches.match
	if(event.request.url.includes('/match/')) return event.respondWith(fetch('/match', {
	    	'credentials': 'same-origin'
	    }).then(response => caches.open(cacheName).then(cache => {
		cache.put('/match', response.clone());
		return response;
	})).catch(error => caches.open(cacheName).then(cache => cache.match('/match'))));

	if(event.request.url.includes('/api/team/')) return event.respondWith((async () => {
	    let team = await fetch(event.request, {
	    	'credentials': 'same-origin'
	    }).catch(error => null);
	    if(team !== null) return team;

	    let matches = await getMatches();
	    await calculateStats();
	    let teams = await getJSON(caches.match('/api/teams'));
	    let teamNumber = Number(event.request.url.split('/').slice(-1));
	    // Security check
	    team = teams.filter(team => team.number === teamNumber)[0];
	    let changes = await filterChanges();
	    for(let change of changes) if(change.type === 'match-attribute') {
	    	let matchIndex = matches.map(match => match.number).indexOf(change.match);
	    	matches[matchIndex][change.alliance][matches[matchIndex][change.alliance].map(team => team.number).indexOf(change.team)].stats[change.stat] = change.value;
	    }

	    return new Response(JSON.stringify({
	    	...team,
	    	'matches': (() => {
	    		let teamMatches = [];
	    		matches.forEach(match => {
	    			match.red.forEach(team => {
	    				if(team.number === teamNumber) teamMatches.push({
	    					'matchNumber': match.number,
	    					'stats': team.stats
	    				});
	    			});
	    			match.blue.forEach(team => {
	    				if(team.number === teamNumber) if(team.number === teamNumber) teamMatches.push({
	    					'matchNumber': match.number,
	    					'stats': team.stats
	    				});
	    			});
	    		});
	    		return teamMatches;
	    	})()
	    }), {
	        'headers': {
	            'Content-Type': 'application/json'
	        }
	    });
	})());

	if(event.request.url.includes('/team/')) return event.respondWith(fetch('/team', {
	    	'credentials': 'same-origin'
	    }).then(response => caches.open(cacheName).then(cache => {
		cache.put('/team', response.clone());
		return response;
	})).catch(error => caches.open(cacheName).then(cache => cache.match('/team'))));

	if(event.request.url.includes('/api/teams')) return event.respondWith((async () => {
	    let teams = await fetch(event.request, {
	    	'credentials': 'same-origin'
	    }).catch(error => null);
	    if(teams !== null) {
	    	await caches.open(cacheName).then(cache => cache.put('/api/teams', teams.clone()));
	    	return teams;
	    }

	    await calculateStats();
	    teams = await getJSON(caches.match('/api/teams'));

	    return new Response(JSON.stringify(teams), {
	        'headers': {
	            'Content-Type': 'application/json'
	        }
	    });
	})());

	event.respondWith(fetch(event.request).then(response => caches.open(cacheName).then(cache => {
		cache.put(event.request.url, response.clone());
		return response;
	})).catch(error => caches.open(cacheName).then(cache => cache.match(event.request))));
});

self.addEventListener('sync', event => {
	if(event.tag === 'sync-data') event.waitUntil(syncData());
});