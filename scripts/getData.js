const fs = require('fs');
const request = require('request');
const config = require('../config.json');

let database = {
    'teams': [],
    'matches': []
};

request({
    'url': `https://www.thebluealliance.com/api/v3/event/${config.eventId}/teams/simple`,
    'headers': {
        'X-TBA-Auth-Key': config.tbaKey
    },
    'method': 'GET',
    'json': true
}, (error, response, body) => {
    database.teams = body.map(team => ({
        ...team,
        'stats': (() => {
            let stats = {};
            for(const stat in config.defaultStats) if(config.statTypes[stat] !== 'matchOnly') stats[stat] = config.defaultStats[stat];
            return stats;
        })(),
        'additionalData': config.additionalTeamData
    }));
    request({
        'url': `https://www.thebluealliance.com/api/v3/event/${config.eventId}/matches/simple`,
        'headers': {
            'X-TBA-Auth-Key': config.tbaKey
        },
        'method': 'GET',
        'json': true
    }, (error, response, body) => {
        database.matches = body.filter(x => x.comp_level === 'qm').map(({match_number, alliances}) => ({
            match_number,
            'red': alliances.red.team_keys.map(x => ({
                'number': Number(x.slice(3)),
                'stats': config.defaultStats
            })),
            'blue': alliances.blue.team_keys.map(x => ({
                'number': Number(x.slice(3)),
                'stats': config.defaultStats
            }))
        })).sort((a, b) => a.match_number - b.match_number);
        fs.writeFileSync('data/database.json', JSON.stringify(database, null, '\t'));
    });
});