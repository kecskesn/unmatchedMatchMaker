const heroes = require("../../config/heroes");
const players = require("../../config/players");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const searchStrategies = require("./searchStrategies/searchStrategies");
const { saveMatchToDB, getMatchLogsFromDB, deleteMatchLogByIdFromDB, getMatchesByHero } = require('./db')

const util = require('util');
const { mergeStats } = require("../util/helper");
const readFileAsync = util.promisify(fs.readFile);

function getHeroes() {
  return heroes.sort((a, b) => {
    const nameA = a.toLowerCase();
    const nameB = b.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}

function getPlayers() {
  return players;
}

async function getHeroDeck(hero) {
  const decodedName = decodeURIComponent(hero);
  const symbolRemovedName = decodedName.replace(/[^\w\s]/g, '');
  const finalName = symbolRemovedName.replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) => {
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  }).replace(/\s+/g, '');

  const deckFilePath = path.join(
    __dirname,
    "../..",
    "config",
    "decks",
    `${finalName}.json`
  );

  try {
    const data = await readFileAsync(deckFilePath, "utf8");
    const deck = JSON.parse(data);
    return deck;
  } catch (error) {
    return null;
  }
}

async function getHeroStats(hero, numberOfPlays, mode, source, fairnessThreshold) {
  const encodedHero = encodeURIComponent(hero);

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
      const localResult = await getMatchesByHero(hero);
      localData = localResult.success ? localResult.matches : [];
    }
  } catch (error) {
    console.error(error);
    throw new Error("Failed to retrieve data.");
  }

  let mergedData = [];

  if (source === 'both') {
    mergedData = mergeStats(umleagueData, localData);
  } else {
    mergedData = source === 'umleague' ? umleagueData : localData;
  }

  mergedData.forEach((item) => {
    item.winPercent = item.plays > 0 ? Math.round(item.wins / item.plays * 100) : 0;

    if (item.combinedPlays && item.combinedWins && item.combinedLosses) {
      item.combinedWinPercent = item.combinedPlays > 0 ? Math.round(item.combinedWins / item.combinedPlays * 100) : 0;
    }
  })

  const filteredData = mergedData.filter((item) => item.combinedPlays ? item.combinedPlays >= numberOfPlays : item.plays >= numberOfPlays);
  let result = searchStrategies[mode].handle(filteredData, fairnessThreshold);
  result = result.filter((item) => item.hero !== hero);
  return result;
}

function getMatchLogs(heroFilter, dateFilter) {
  return getMatchLogsFromDB(heroFilter, dateFilter);
}

function logMatch(hero1, hero2, player1, player2, winner) {
  return saveMatchToDB(hero1, hero2, player1, player2, winner);
}

async function getPlayerStatistics() {
  const { matches } = await getMatchLogsFromDB();

  const distinctPlayers = [...new Set(matches.flatMap(match => [match.player1, match.player2]))];

  const distinctPlayersStats = {};

  distinctPlayers.forEach((player) => {
    const playerStats = {
      wins: 0,
      losses: 0,
      plays: 0,
    };
    const playerMatches = matches.filter(match => match.player1 === player || match.player2 === player);
    const playerHeroes = {};
    const enemyPlayers = {};

    playerMatches.forEach((match) => {
      const { player1, player2, winnerPlayer, hero1, hero2 } = match;
      const playerHero = player1 === player ? hero1 : hero2;
      const isWinner = player === winnerPlayer;
      const enemyPlayer = player1 === player ? player2 : player1;

      if (!playerHeroes[playerHero]) {
        playerHeroes[playerHero] = { wins: 0, losses: 0, plays: 0 };
      }

      if (!enemyPlayers[enemyPlayer]) {
        enemyPlayers[enemyPlayer] = { wins: 0, losses: 0, plays: 0 };
      }

      playerHeroes[playerHero].plays++;
      enemyPlayers[enemyPlayer].plays++;
      playerStats.plays++;
      if (isWinner) {
        playerHeroes[playerHero].wins++;
        enemyPlayers[enemyPlayer].wins++;
        playerStats.wins++;
      } else {
        playerHeroes[playerHero].losses++;
        enemyPlayers[enemyPlayer].losses++;
        playerStats.losses++;
      }
    });

    const heroStatsArray = Object.entries(playerHeroes).map(([name, stats]) => ({
      name,
      wins: stats.wins,
      losses: stats.losses,
      plays: stats.plays,
      winRate: Math.round((stats.wins / stats.plays) * 100),
    }));

    const enemyStatsArray = Object.entries(enemyPlayers).map(([name, stats]) => ({
      name,
      wins: stats.wins,
      losses: stats.losses,
      plays: stats.plays,
      winRate: Math.round((stats.wins / stats.plays) * 100),
    }));

    distinctPlayersStats[player] = { ...playerStats, winRate: Math.round((playerStats.wins / playerStats.plays) * 100), heroStats: heroStatsArray, enemyStats: enemyStatsArray };
  });

  return distinctPlayersStats;
}

function deleteMatchLogById(logId) {
  return deleteMatchLogByIdFromDB(logId);
}

module.exports = {
  getHeroes,
  getPlayers,
  getHeroDeck,
  getHeroStats,
  getMatchLogs,
  logMatch,
  getPlayerStatistics,
  deleteMatchLogById
}