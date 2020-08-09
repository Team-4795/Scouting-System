const fs = require('fs');
const request = require('request-promise-native');
const { createCanvas, loadImage } = require('canvas');
const database = require('../data/database.json');
const config = require('../config.json');

function getAbilities(teamId, match, zebraData) {
    let teamNumber = match.alliances.red.team_keys.indexOf(teamId);
    let teamColor = 'red';
    if(teamNumber === -1) {
        teamNumber = match.alliances.blue.team_keys.indexOf(teamId);
        teamColor = 'blue';
    }
    teamNumber++;
    // Detect defenders?
    let abilities = {
        'canClimb': match.score_breakdown[teamColor]['endgameRobot' + teamNumber] === 'Hang',
        'hasAuto': match.score_breakdown[teamColor]['initLineRobot' + teamNumber] === 'Exited',
        'useTrench': false,
        'useFeeder': false,
        'speed': 0,
        // Doesn't belong in abilites, possibly as an average
        'fouls': 0,
        'autoShape': null
    };
    let positions = [];
    let speeds = [];
    if(zebraData !== null) {
        let xs = zebraData.alliances[teamColor][teamNumber - 1].xs;
        let ys = zebraData.alliances[teamColor][teamNumber - 1].ys;
        xs.forEach((x, i) => {
            // Fill in missing data
            if(x !== null) {
                if(i % 5 === 0 && i !== 0) speeds.push(Math.sqrt((x - xs[i - 5]) ** 2 + (ys[i] - ys[i - 5]) ** 2) / 0.5);
                let position = {
                    x,
                    'y': ys[i],
                    'time': zebraData.times[i]
                };
                positions.push(position);
                // Should have to go all the way through
                if(teamColor === 'red' && position.x < 21.83 && position.x > 21.66 && position.y < 4.6) abilities.useTrench = true;
                if(teamColor === 'blue' && position.x < 35.17 && position.x > 35.34 && position.y > 22.4) abilities.useTrench = true;
                // Feeder stations, potentially stay there for a certain amount of time, heatmaps
                // Foul detection, use percent chance instead of boolean?
                /*
                if(red robot touching blue in blue's zone && red recieved penalties) fouls++;
                if(blue robot touching red in red's zone && blue recieved penalties) fouls++;
                Penalties from bumping opponents during endgame?
                */
            }
        });
        if(speeds.length > 0) abilities.speed = speeds.reduce((a, b) => a + b) / speeds.length;
        if(abilities.hasAuto && positions.length > 0) {
            // Show match number
            const canvas = createCanvas(52 * 3, 27 * 3);
            const ctx = canvas.getContext('2d');
            ctx.translate(0, 27 * 3);
            ctx.scale(1, -1);
            ctx.fillStyle = 'rgb(200, 200, 200)';
            ctx.fillRect(0, 0, 52 * 3, 27 * 3);
            ctx.stroke();
            ctx.strokeStyle = 'black';
            ctx.rect(0, 0, 52 * 3, 27 * 3);
            ctx.stroke();
            ctx.fillStyle = 'white';
            if(teamColor === 'red') ctx.fillRect(42 * 3, 0, 1 * 3, 27 * 3);
            if(teamColor === 'blue') ctx.fillRect(10 * 3, 0, 1 * 3, 27 * 3);
            ctx.stroke();
            positions.slice(0, 150).forEach(({x, y}, i) => {
                ctx.beginPath();
                let color = `rgb(${Math.floor(i)}, ${Math.floor(i)}, ${i + 75})`;
                ctx.strokeStyle = color;
                ctx.fillStyle = color;
                ctx.lineWidth = 2;
                ctx.arc(x * 3, y * 3, 1, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.stroke();
            });
            abilities.autoShape = canvas;
            // fs.writeFile(`data/${teamId}.png`, abilities.autoShape.replace(/^data:image\/png;base64,/, ''), 'base64', () => {});
        }
    }
    return abilities;
}

(async () => {
    let matches = await request({
        'url': `https://www.thebluealliance.com/api/v3/event/${config.eventId}/matches/simple`,
        'headers': {
            'X-TBA-Auth-Key': config.tbaKey
        },
        'method': 'GET',
        'json': true
    });
    // Maybe filter playoff matches?
    // matches = matches.filter(x => x.comp_level === 'qm');
    let teamAbilites = {};
    for(const m of matches) {
        let matchId = m.key;
        let match = await request({
            'url': `https://www.thebluealliance.com/api/v3/match/${matchId}`,
            'headers': {
                'X-TBA-Auth-Key': config.tbaKey
            },
            'method': 'GET',
            'json': true
        });
        let zebraData = await request({
            'url': `https://www.thebluealliance.com/api/v3/match/${matchId}/zebra_motionworks`,
            'headers': {
                'X-TBA-Auth-Key': config.tbaKey
            },
            'method': 'GET',
            'json': true
        }).catch(() => null);
        let matchAbilites = {};
        match.alliances.red.team_keys.forEach(teamId => matchAbilites[teamId] = getAbilities(teamId, match, zebraData));
        match.alliances.blue.team_keys.forEach(teamId => matchAbilites[teamId] = getAbilities(teamId, match, zebraData));
        for(const teamId in matchAbilites) {
            if(teamAbilites[teamId] === undefined) {
                teamAbilites[teamId] = matchAbilites[teamId];
                if(matchAbilites[teamId].autoShape !== null) {
                    teamAbilites[teamId].autoShape = [matchAbilites[teamId].autoShape];
                } else {
                    teamAbilites[teamId].autoShape = [];
                }
            } else {
                // Percent success instead of boolean
                if(matchAbilites[teamId].canClimb) teamAbilites[teamId].canClimb = true;
                if(matchAbilites[teamId].hasAuto) teamAbilites[teamId].hasAuto = true;
                // Count instead of boolean
                if(matchAbilites[teamId].useTrench) teamAbilites[teamId].useTrench = true;
                if(matchAbilites[teamId].useFeeder) teamAbilites[teamId].useFeeder = true;
                if(matchAbilites[teamId].autoShape !== null) teamAbilites[teamId].autoShape.push(matchAbilites[teamId].autoShape);
                // Average fouls and speed
            }
        }
    }
    for(const teamId in teamAbilites) {
        let canvas = createCanvas(52 * 3 * 3, 27 * 3 * Math.ceil(teamAbilites[teamId].autoShape.length / 3));
        let ctx = canvas.getContext('2d');
        teamAbilites[teamId].autoShape.forEach((shape, i) => {
            ctx.drawImage(shape, 52 * 3 * (i % 3), 27 * 3 * (Math.floor(i / 3)));
        });
        // fs.writeFile(`data/${teamId}.png`, canvas.toDataURL().replace(/^data:image\/png;base64,/, ''), 'base64', () => {});
        teamAbilites[teamId].autoShape = canvas.toDataURL();
        database.teams.filter(number => number.number === Number(teamId.slice(3)))[0].additionalData = teamAbilites[teamId];
    }
    // Fill in match data
    fs.writeFileSync('data/database.json', JSON.stringify(database, null, '\t'));
    console.log(teamAbilites);
})();