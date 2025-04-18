const express = require("express");
const path = require("path");
const bodyParser = require('body-parser');
const { getHeroes, getPlayers, getHeroDeck, getHeroStats, getMapStats, getMatchLogs, getOverallHeroStats, logMatch, getPlayerStatistics, deleteMatchLogById } = require('./service/unmatchedservice');
const { replaceHeroName } = require("./util/helper");

const app = express();

app.use(express.static(path.join(__dirname, '..', '')));
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.redirect("/matchups");
});

app.get("/matchups", function (req, res) {
  res.sendFile(__dirname + "/html/matchups.html");
});

app.get("/mapStat", function (req, res) {
  res.sendFile(__dirname + "/html/mapStat.html");
});

app.get("/cardTracker", function (req, res) {
  res.sendFile(__dirname + "/html/cardTracker.html");
});

app.get("/matchLogger", function (req, res) {
  res.sendFile(__dirname + "/html/matchLogger.html");
});

app.get("/playerStats", function (req, res) {
  res.sendFile(__dirname + "/html/playerStats.html");
});

app.get("/heroStats", function (req, res) {
  res.sendFile(__dirname + "/html/heroStats.html");
});

app.get("/heroes", (req, res) => {
  const heroes = getHeroes();
  res.json(heroes);
});

app.get("/players", (req, res) => {
  const players = getPlayers();
  res.json(players);
});

app.get("/deck", replaceHeroName, async (req, res) => {
  const hero = req.query.hero;
  const deck = await getHeroDeck(hero);
  res.json(deck);
});

app.get("/matches", async (req, res) => {
  const hero = req.query.hero;
  const mode = req.query.mode;
  const fairnessThreshold = req.query.fairnessThreshold;
  const numberOfPlays = req.query.numberOfPlays;
  const source = req.query.source;

  const result = await getHeroStats(hero, numberOfPlays, mode, source, fairnessThreshold);
  res.send({ result });
});

app.get("/mapStats", async (req, res) => {
  const hero1 = req.query.hero1;
  const hero2 = req.query.hero2;

  const result = await getMapStats(hero1, hero2);
  res.send({ result });
});

app.get('/matchLogs', async (req, res) => {
  const { date = '2w', hero = '', player = '' } = req.query;
  const matchLogsResult = await getMatchLogs(date, hero, player);
  res.send(matchLogsResult);
});

app.post('/overallHeroStats', async (req, res) => {
  const sources = req.body.sources;
  const overallHeroStats = await getOverallHeroStats(sources);
  res.send(overallHeroStats);
});

app.post('/matchLogs', async (req, res) => {
  const { hero1, hero2, player1, player2, winner } = req.body;

  if (player1 === player2) {
    res.send({ success: false, error: 'Players must be different.' });
    return;
  }

  if (hero1 === hero2) {
    res.send({ success: false, error: 'Heroes must be different.' });
    return;
  }

  const logMatchResult = await logMatch(hero1, hero2, player1, player2, winner);
  res.send(logMatchResult);
});

app.get('/playerStatistics', async (req, res) => {
  const playerStatistics = await getPlayerStatistics();
  res.send(playerStatistics);
});

app.delete('/deleteMatchLog/:logId', async (req, res) => {
  const { logId } = req.params;
  const deleteResult = await deleteMatchLogById(logId);
  res.send(deleteResult);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
