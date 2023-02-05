const express = require('express');
const axios = require('axios');
const heroes = require('./constants/heroes')

const app = express();

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/heroes', (req, res) => {
    res.json(heroes);
});
 
app.get('/matches', (req, res) => {
    const hero = req.query.hero;
    const encodedHero = encodeURIComponent(hero);
    const numberOfPlays = req.query.numberOfPlays;

    axios.get(`https://www.umleague.net/api/analytics/getHeroResultsByMap?hero=${encodedHero}&campaignid=10000&organizerid=0`)
        .then(apiRes => {
            const repeatOpponent = apiRes.data.repeatOpponent.map(item => {
                return {
                    hero: item.hero,
                    plays: item.queryOpponentOverall[0].plays,
                    winPercent: parseFloat(item.queryOpponentOverall[0].winpercent)
                };
            });

            const filteredRepeatOpponent = repeatOpponent.filter(item => item.plays >= numberOfPlays);
            const sortedFilteredRepeatOpponent = filteredRepeatOpponent.sort((a, b) => b.winPercent - a.winPercent);
            res.send({ sortedFilteredRepeatOpponent });
        })
        .catch(error => {
            console.error(error);
            res.status(500).send({ error: 'Failed to retrieve data from the API.' });
        });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});
