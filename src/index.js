const express = require("express");
const path = require("path");
const bodyParser = require('body-parser');
const { getHeroes, getPlayers, getHeroDeck, getHeroStats, getMatchLogs, logMatch, getPlayerTopHeroStats, deleteMatchLogById } = require('./service/unmatchedservice')

const app = express();

app.use(express.static(path.join(__dirname, '..', '')));
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.redirect("/heroStat");
});

app.get("/heroStat", function (req, res) {
  res.sendFile(__dirname + "/html/heroStat.html");
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

app.get("/heroes", (req, res) => {
  const heroes = getHeroes();
  res.json(heroes);
});

app.get("/players", (req, res) => {
  const players = getPlayers();
  res.json(players);
});

app.get("/deck", async (req, res) => {
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

app.get('/matchLogs', async (req, res) => {
  const { date = '2w', hero = '' } = req.query;
  const matchLogsResult = await getMatchLogs(date, hero);
  res.send(matchLogsResult);
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

app.get('/playerTopHeroStats', async (req, res) => {
  const playerTopHeroStats = await getPlayerTopHeroStats();
  res.send(playerTopHeroStats);
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
