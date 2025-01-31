const heroes = require("../../config/heroes");
const players = require("../../config/players");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const searchStrategies = require("./searchStrategies/searchStrategies");
const { saveMatchToDB, getMatchLogsFromDB, getOverallHeroStatsFromDB, deleteMatchLogByIdFromDB, getMatchesByHero } = require('./db')

const util = require('util');
const { mergeStats } = require("../util/helper");
const readFileAsync = util.promisify(fs.readFile);

function toCamelCase(str) {
  const symbolRemovedName = str.replace(/[^\w\s]/g, '');
  const finalName = symbolRemovedName.replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) => {
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  }).replace(/\s+/g, '');
  return finalName;
}

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
  const camelCaseHeroName = toCamelCase(decodedName);

  const deckFilePath = path.join(
    __dirname,
    "../..",
    "config",
    "decks",
    `${camelCaseHeroName}.json`
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
  const umleagueStatsFilePath = path.join(__dirname, '..', '..', 'config', 'heroStats', `${toCamelCase(hero)}.json`);

  let umleagueData = [];
  let localData = [];

  try {
    if (source === 'umleague' || source === 'both') {
      const data = await readFileAsync(umleagueStatsFilePath, 'utf8');
      const umleagueResult = JSON.parse(data);

      umleagueData = umleagueResult.repeatOpponent.map((item) => ({
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

async function getMapStats(hero1, hero2) {
  const umleagueStatsFilePath = path.join(__dirname, '..', '..', 'config', 'heroStats', `${toCamelCase(hero1)}.json`);

  const data = await readFileAsync(umleagueStatsFilePath, 'utf8');
  const umleagueResult = JSON.parse(data);
  const opponent = umleagueResult.repeatOpponent.find((opponent) => opponent.hero === hero2);

  if (!opponent) {
    return null;
  }

  const filteredMapStats = opponent.repeatMap.filter((item) => item.queryResult.length > 0);
  const mappedMapStats = filteredMapStats.map((item) => ({
    map: item.mapName,
    plays: item.queryResult[0].plays,
    winpercent: item.queryResult[0].winpercent,
  }))
  const sortedMapStats = mappedMapStats.sort((a, b) => b.winpercent - a.winpercent || b.plays - a.plays);

  return sortedMapStats;
}

function getMatchLogs(heroFilter, dateFilter, player) {
  return getMatchLogsFromDB(heroFilter, dateFilter, player);
}

async function getOverallHeroStats(sources) {
  const overallHeroStats = [];

  heroes.forEach(hero => {
    overallHeroStats.push({
      hero,
      plays: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    });
  });

  if (sources.includes('Local')) {
    const overallHeroStatsFromDB = await getOverallHeroStatsFromDB();

    overallHeroStatsFromDB['results'].forEach((heroStat) => {
      const heroIndex = overallHeroStats.findIndex(hero => hero.hero === heroStat.hero);
      if (heroIndex !== -1) {
        overallHeroStats[heroIndex].plays += heroStat.plays;
        overallHeroStats[heroIndex].wins += heroStat.wins;
        overallHeroStats[heroIndex].losses += heroStat.total - heroStat.wins;
      }  else {
        overallHeroStats.push(heroStat);
      }
    });
  }

  if (sources.includes('UMLeague')) {
    const overallHeroStatsFromUmleague = await Promise.all(heroes.map(async (hero) => {
      const umleagueStatsFilePath = path.join(__dirname, '..', '..', 'config', 'heroStats', `${toCamelCase(hero)}.json`);

      const data = await readFileAsync(umleagueStatsFilePath, 'utf8');
      const umleagueResult = JSON.parse(data);
      const queryHeroOverall = umleagueResult.queryHeroOverall[0];

      return {
        hero,
        plays: queryHeroOverall.plays,
        wins: queryHeroOverall.wins,
        losses: queryHeroOverall.losses,
      };
    }));

    overallHeroStatsFromUmleague.forEach((heroStat) => {
      const heroIndex = overallHeroStats.findIndex(hero => hero.hero === heroStat.hero);
      if (heroIndex !== -1) {
        overallHeroStats[heroIndex].plays += heroStat.plays;
        overallHeroStats[heroIndex].wins += heroStat.wins;
        overallHeroStats[heroIndex].losses += heroStat.losses;
      } else {
        overallHeroStats.push(heroStat);
      }
    });
  }

  overallHeroStats.forEach((heroStat) => {
    heroStat.winRate = heroStat.plays > 0 ? Math.round((heroStat.wins / heroStat.plays) * 100) : 0;
  });

  overallHeroStats.sort((a, b) => b.winRate - a.winRate || b.plays - a.plays);

  return overallHeroStats;
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
  getMapStats,
  getMatchLogs,
  getOverallHeroStats,
  logMatch,
  getPlayerStatistics,
  deleteMatchLogById
}