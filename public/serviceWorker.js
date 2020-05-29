self.importScripts('/scripts/idb.js');
self.importScripts('/scripts/store.js');

let cacheName = 'offline-cache';
let filesToCache = [
	'/',
	'/stats',
	'/match',
	'/team',
	'/offline',
	'/api/team-number',
	'/api/matches',
	'scripts/index.js',
	'scripts/idb.js',
	'scripts/match.js',
	'scripts/stats.js',
	'scripts/store.js',
	'scripts/team.js',
	'styles/index.css',
	'styles/match.css',
	'styles/stats.css',
	'styles/team.css',
	'/images/logo.png'
];

function getText(responsePromise) {
	return responsePromise.then(response => response.text());
}

function syncMatchAttribute() {
	store.changes('readonly').then(changes => changes.getAll()).then(changes => Promise.all(changes.map(change => {
		return fetch('/api/update-match-attribute', {
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

self.addEventListener('install', event => {
	caches.delete(cacheName);
	event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(filesToCache)));
	self.skipWaiting();
});

self.addEventListener('activate', event => {
	event.waitUntil(caches.keys().then(keyList => Promise.all(keyList.map(key => {
		if(key !== cacheName) return caches.delete(key);
	}))));
	self.clients.claim();
});

self.addEventListener('fetch', event => {
	// Load /api/matches from cache first, then request
	if(event.request.url.includes('/api/match/')) return event.respondWith((async () => {
	    let match = await fetch(event.request, {
	    	'credentials': 'same-origin'
	    }).catch(error => null);
	    if(match !== null) return match;

	    let matches = await getText(caches.match('/api/matches'));
	    matches = JSON.parse(matches);
	    let matchNumber = Number(event.request.url.split('/').slice(-1));
	    match = matches[matchNumber - 1];
	    let changes = await store.changes('readonly').then(changes => changes.getAll());

	    for(let change of changes) {
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

	if(event.request.url.includes('/team/') && !event.request.url.includes('/api/')) return event.respondWith(fetch('/team', {
	    	'credentials': 'same-origin'
	    }).then(response => caches.open(cacheName).then(cache => {
		cache.put('/team', response.clone());
		return response;
	})).catch(error => caches.open(cacheName).then(cache => cache.match('/offline'))));

	if(new URL(event.request.url).pathname === '/stats') return event.respondWith(fetch('/stats', {
	    	'credentials': 'same-origin'
	    }).then(response => caches.open(cacheName).then(cache => {
		cache.put('/stats', response.clone());
		return response;
	})).catch(error => caches.open(cacheName).then(cache => cache.match('/offline'))));

	event.respondWith(fetch(event.request).then(response => caches.open(cacheName).then(cache => {
		if(!event.request.url.includes('/api/')) cache.put(event.request.url, response.clone());
		return response;
	})).catch(error => caches.open(cacheName).then(cache => cache.match(event.request))));
});

self.addEventListener('sync', event => {
	if(event.tag === 'sync-match-attribute') event.waitUntil(syncMatchAttribute());
});