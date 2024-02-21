const express = require("express");
const axios = require("axios");
const path = require("path");
const heroes = require("./config/heroes");
const fs = require("fs");
const searchStrategies = require("./searchStrategies/searchStrategies");
const bodyParser = require('body-parser');
const { db, logMatch, getRecentMatches, deleteMatchLogById, getHeroMatches } = require('./db/db')

const app = express();

app.use(express.static(path.join(__dirname, '')));
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.redirect("/heroStat");
});

app.get("/heroStat", function (req, res) {
  res.sendFile(__dirname + "/heroStat.html");
});

app.get("/cardTracker", function (req, res) {
  res.sendFile(__dirname + "/cardTracker.html");
});

app.get("/matchLogger", function (req, res) {
  res.sendFile(__dirname + "/matchLogger.html");
});

app.get("/heroes", (req, res) => {
  heroes.sort((a, b) => {
    const nameA = a.toLowerCase();
    const nameB = b.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  res.json(heroes);
});

app.get("/deck", (req, res) => {
  const hero = req.query.hero;
  const decodedName = decodeURIComponent(hero);
  const symbolRemovedName = decodedName.replace(/[^\w\s]/g, '');
  const finalName = symbolRemovedName.replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) => {
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  }).replace(/\s+/g, '');

  const deckFilePath = path.join(
    __dirname,
    "config",
    "decks",
    `${finalName}.json`
  );

  fs.readFile(deckFilePath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error reading deck configuration");
    }

    try {
      const deckConfig = JSON.parse(data);
      res.json(deckConfig);
    } catch (parseError) {
      console.error(parseError);
      res.status(500).send("Error parsing deck configuration");
    }
  });
});

app.get("/matches", async (req, res) => {
  const hero = req.query.hero;
  const encodedHero = encodeURIComponent(hero);
  const numberOfPlays = req.query.numberOfPlays;
  const mode = req.query.mode;
  const source = req.query.source;

  let umleagueData = [];
  let localData = [];

  try {
    if (source === 'umleague' || source === 'both') {
      const apiRes = await axios.get(`https://www.umleague.net/api/analytics/getHeroResultsByMap?hero=${encodedHero}&campaignid=10000&organizerid=0`);
      
      umleagueData = apiRes.data.repeatOpponent.map((item) => ({
        hero: item.hero,
        plays: Number(item.queryOpponentOverall[0].plays),
        wins: Number(item.queryOpponentOverall[0].wins),
        losses: Number(item.queryOpponentOverall[0].losses),
      }));
    }

    if (source === 'local' || source === 'both') {
      const localResult = await getHeroMatchesAsync(hero);
      localData = localResult.success ? localResult.matches : [];
    }
  } catch (error) {
    console.error(error);
    throw new Error("Failed to retrieve data.");
  }

  let mergedData = [];

  if (source === 'both') {
    mergedData = mergeData(umleagueData, localData);
  } else {
    mergedData = source === 'umleague' ? umleagueData : localData;
  }

  mergedData.forEach((item) => {
    item.winPercent = item.plays > 0 ? Math.round(item.wins / item.plays * 100) : 0;
  })

  const filteredData = mergedData.filter((item) => item.plays >= numberOfPlays);
  let result = searchStrategies[mode].handle(filteredData);
  result = result.filter((item) => item.hero !== hero);

  res.send({ result });
});

function getHeroMatchesAsync(hero) {
  return new Promise((resolve) => {
    getHeroMatches(hero, (result) => {
      resolve(result);
    });
  });
}

function mergeData(umleagueData, localData) {
  const mergedData = umleagueData.map((umleagueItem) => {
    const localItem = localData.find((localItem) => localItem.hero === umleagueItem.hero);
    if (localItem) {
      return {
        hero: umleagueItem.hero,
        plays: umleagueItem.plays + localItem.plays,
        wins: umleagueItem.wins + localItem.wins,
        losses: umleagueItem.losses + localItem.losses,
      };
    } else {
      return umleagueItem;
    }
  });

  localData.forEach((localItem) => {
    if (!umleagueData.find((umleagueItem) => umleagueItem.hero === localItem.hero)) {
      mergedData.push(localItem);
    }
  });

  return mergedData;
}

app.post('/matchLogs', (req, res) => {
  const { hero1, hero2, winner } = req.body;

  if (hero1 === hero2) {
    res.send({ success: false, error: 'Heroes must be different.' });
    return;
  }

  logMatch(hero1, hero2, winner, (response) => {
    res.send(response);
  });
});

app.get('/matchLogs', (req, res) => {
  getRecentMatches((response) => {
    res.send(response);
  });
});

app.delete('/deleteMatchLog/:logId', (req, res) => {
  const { logId } = req.params;
  deleteMatchLogById(logId, (response) => {
    res.send(response);
  })
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
