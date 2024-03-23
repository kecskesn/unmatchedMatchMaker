const util = require('util');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('matches.db');

const runAsync = util.promisify(db.run.bind(db));
const allAsync = util.promisify(db.all.bind(db));

db.run(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hero1 TEXT NOT NULL,
    hero2 TEXT NOT NULL,
    winner TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function saveMatchToDB(hero1, hero2, winner) {
  const sql = 'INSERT INTO matches (hero1, hero2, winner) VALUES (?, ?, ?)';
  try {
    await runAsync(sql, [hero1, hero2, winner]);
    return { success: true };
  } catch (err) {
    console.error(err);
    throw { success: false, error: 'Failed to insert match record.' };
  }
}

async function getMatchLogsFromDB(dateFilter, heroFilter) {
  let query = 'SELECT id, hero1, hero2, winner, DATE(timestamp) as date FROM matches';
  let params = [];

  if (dateFilter === '2w') {
    query += ' WHERE timestamp >= date(\'now\', \'-15 days\')';
  } else if (dateFilter === '1m') {
    query += ' WHERE timestamp >= date(\'now\', \'-1 month\')';
  } else if (dateFilter === '3m') {
    query += ' WHERE timestamp >= date(\'now\', \'-3 months\')';
  }

  if (heroFilter) {
    if (dateFilter === '2w' || dateFilter === '1m' || dateFilter === '3m') {
      query += ' AND (hero1 = ? OR hero2 = ?)';
    } else {
      query += ' WHERE (hero1 = ? OR hero2 = ?)';
    }
    params.push(heroFilter, heroFilter);
  }

  query += ' ORDER BY timestamp DESC';

  try {
    const matches = await allAsync(query, params);
    return { success: true, matches };
  } catch (err) {
    console.error(err);
    throw { success: false, error: 'Failed to fetch match logs.' };
  }
}

async function deleteMatchLogByIdFromDB(id) {
  const sql = 'DELETE FROM matches WHERE id = ?';
  try {
    await runAsync(sql, [id]);
    return { success: true };
  } catch (err) {
    console.error(err);
    throw { success: false, error: 'Failed to delete match record.' };
  }
}

async function getMatchesByHero(hero) {
  const query = 'SELECT hero1, hero2, winner FROM matches WHERE hero1 = ? OR hero2 = ?';
  try {
    const matches = await allAsync(query, [hero, hero]);
    const heroStats = {};

    matches.forEach(match => {
      const enemyHero = match.hero1 === hero ? match.hero2 : match.hero1;
      const isWinner = match.winner === hero;

      if (!heroStats[enemyHero]) {
        heroStats[enemyHero] = { hero: enemyHero, plays: 0, wins: 0, losses: 0 };
      }
      heroStats[enemyHero].plays++;
      isWinner ? heroStats[enemyHero].wins++ : heroStats[enemyHero].losses++;
    });

    const finalResults = Object.values(heroStats);
    return { success: true, matches: finalResults };
  } catch (err) {
    console.error(err);
    throw { success: false, error: 'Failed to fetch match logs.' };
  }
}

// Close the database connection when your application is shutting down
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0);
  });
});

module.exports = {
  saveMatchToDB,
  getMatchLogsFromDB,
  deleteMatchLogByIdFromDB,
  getMatchesByHero
};
