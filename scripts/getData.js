const fs = require('fs');
const request = require('request');
const config = require('../config.json');

let database = {
    'teams': [],
    'matches': []
};

if(isNaN(config.teamNumber)) {
    throw new TypeError('The team number must be set as a valid number');
}

if(config.defaultStats === undefined || config.statTypes === undefined) throw new Error('Both defaultStats and statTypes must be defined');

for(const stat in config.defaultStats) if(config.statTypes[stat] === undefined) throw new Error(`The type of stat ${stat} is not defined`);

request({
    'url': `https://www.thebluealliance.com/api/v3/event/${config.eventId}/teams/simple`,
    'headers': {
        'X-TBA-Auth-Key': config.tbaKey
    },
    'method': 'GET',
    'json': true
}, (error, response, body) => {
    if(body.Error !== undefined) throw new Error('Event ID or API key invalid');

    database.teams = body.map(({city, country, nickname, state_prov, team_number}) => ({
        'number': team_number,
        city,
        'state': state_prov,
        country,
        'name': nickname,
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
            'number': match_number,
            'red': alliances.red.team_keys.map(x => ({
                'number': Number(x.slice(3)),
                'stats': config.defaultStats
            })),
            'blue': alliances.blue.team_keys.map(x => ({
                'number': Number(x.slice(3)),
                'stats': config.defaultStats
            }))
        })).sort((a, b) => a.number - b.number);
        fs.writeFileSync('data/database.json', JSON.stringify(database));
    });
});