const express = require("express");
const axios = require("axios");
const path = require("path");
const heroes = require("./constants/heroes");
const fs = require("fs");
const searchStrategies = require("./searchStrategies/searchStrategies");

const app = express();

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/cardTracker", function (req, res) {
  res.sendFile(__dirname + "/cardTracker.html");
});

app.get("/heroes", (req, res) => {
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
    "constants",
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

app.get("/matches", (req, res) => {
  const hero = req.query.hero;
  const encodedHero = encodeURIComponent(hero);
  const numberOfPlays = req.query.numberOfPlays;
  const mode = req.query.mode;

  axios
    .get(
      `https://www.umleague.net/api/analytics/getHeroResultsByMap?hero=${encodedHero}&campaignid=10000&organizerid=0`
    )
    .then((apiRes) => {
      const repeatOpponent = apiRes.data.repeatOpponent.map((item) => {
        return {
          hero: item.hero,
          plays: item.queryOpponentOverall[0].plays,
          winPercent: parseFloat(item.queryOpponentOverall[0].winpercent),
        };
      });

      const filteredRepeatOpponent = repeatOpponent.filter(
        (item) => item.plays >= numberOfPlays
      );
      const result = searchStrategies[mode].handle(filteredRepeatOpponent);
      res.send({ result });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send({ error: "Failed to retrieve data from the API." });
    });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
