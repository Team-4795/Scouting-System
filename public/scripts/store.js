const store = {
	'db': null,
	'init': () => {
		if(store.db !== null) return Promise.resolve(store.db);
		return idb.open('offline-data', 1, upgradeDb => {
			upgradeDb.createObjectStore('changes', {
				'autoIncrement': true,
				'keyPath': 'id'
			});
		}).then(db => store.db = db);
	},
	'changes': mode => store.init().then(db => db.transaction('changes', mode).objectStore('changes'))
};