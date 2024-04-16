const heroes = require("../../config/heroes");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const searchStrategies = require("./searchStrategies/searchStrategies");
const { saveMatchToDB, getMatchLogsFromDB, getWinnerPersonStatsFromDB, deleteMatchLogByIdFromDB, getMatchesByHero } = require('./db')

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

async function getHeroStats(hero, numberOfPlays, mode, source) {
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
  let result = searchStrategies[mode].handle(filteredData);
  result = result.filter((item) => item.hero !== hero);
  return result;
}

function getMatchLogs(heroFilter, dateFilter) {
  return getMatchLogsFromDB(heroFilter, dateFilter);
}

function logMatch(hero1, hero2, winner, person) {
  return saveMatchToDB(hero1, hero2, winner, person);
}

function getWinnerPersonStats() {
  return getWinnerPersonStatsFromDB();
}

async function getPlayerTopHeroStats() {
  const { matches } = await getMatchLogsFromDB();

  const playerStats = {
    "Balázs": [],
    "Keca": [],
  };

  matches.forEach((match) => {
    const { hero1, hero2, winner, person } = match;
    const winnerHero = hero1 === winner ? hero1 : hero2;
    const loserHero = hero1 === winner ? hero2 : hero1;
    const loserPerson = person === "Balázs" ? "Keca" : "Balázs";

    let winnerHeroStats = playerStats[person].find(hero => hero.name === winnerHero);
    if (!winnerHeroStats) {
      winnerHeroStats = {
        name: winnerHero,
        wins: 0,
        losses: 0,
        plays: 0,
      };
      playerStats[person].push(winnerHeroStats);
    }
    winnerHeroStats.wins++;
    winnerHeroStats.plays++;

    let loserHeroStats = playerStats[loserPerson].find(hero => hero.name === loserHero);
    if (!loserHeroStats) {
      loserHeroStats = {
        name: loserHero,
        wins: 0,
        losses: 0,
        plays: 0,
      };
      playerStats[loserPerson].push(loserHeroStats);
    }
    loserHeroStats.losses++;
    loserHeroStats.plays++;
  });

  // Sort hero arrays by plays
  playerStats.Balázs.sort((a, b) => b.plays - a.plays);
  playerStats.Keca.sort((a, b) => b.plays - a.plays);

  // Calculate win rate for each hero
  playerStats.Balázs.forEach((hero) => {
    hero.winRate = Math.round((hero.wins / hero.plays) * 100);
  });
  playerStats.Keca.forEach((hero) => {
    hero.winRate = Math.round((hero.wins / hero.plays) * 100);
  });

  return playerStats;
}

function deleteMatchLogById(logId) {
  return deleteMatchLogByIdFromDB(logId);
}

module.exports = {
  getHeroes,
  getHeroDeck,
  getHeroStats,
  getMatchLogs,
  logMatch,
  getWinnerPersonStats,
  getPlayerTopHeroStats,
  deleteMatchLogById
}