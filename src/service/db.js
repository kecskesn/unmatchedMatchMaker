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
    player1 TEXT NOT NULL,
    player2 TEXT NOT NULL,
    winner TEXT NOT NULL,
    winnerPlayer TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function saveMatchToDB(hero1, hero2, player1, player2, winner) {
  const sql = 'INSERT INTO matches (hero1, hero2, player1, player2, winner, winnerPlayer) VALUES (?, ?, ?, ?, ?, ?)';
  try {
    const winnerPlayer = winner === hero1 ? player1 : player2;
    await runAsync(sql, [hero1, hero2, player1, player2, winner, winnerPlayer]);
    return { success: true };
  } catch (err) {
    console.error(err);
    throw { success: false, error: 'Failed to insert match record.' };
  }
}

async function getMatchLogsFromDB(dateFilter, heroFilter, playerFilter) {
  let query = 'SELECT id, hero1, hero2, player1, player2, winner, winnerPlayer, DATE(timestamp) as date FROM matches WHERE 1=1';
  let params = [];

  if (heroFilter) {
    query += ' AND (hero1 = ? OR hero2 = ?)';
    params.push(heroFilter, heroFilter);
  }

  if (playerFilter) {
    query += ' AND (player1 = ? OR player2 = ?)';
    params.push(playerFilter, playerFilter);
  }

  if (dateFilter) {
    if (dateFilter === '2w') {
      query += ' AND timestamp >= date(\'now\', \'-15 days\')';
    } else if (dateFilter === '1m') {
      query += ' AND timestamp >= date(\'now\', \'-1 month\')';
    } else if (dateFilter === '3m') {
      query += ' AND timestamp >= date(\'now\', \'-3 months\')';
    }
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

async function getOverallHeroStatsFromDB() {
  const query = `
    SELECT hero, 
           COUNT(*) AS plays, 
           SUM(CASE WHEN winner = hero THEN 1 ELSE 0 END) AS wins
    FROM (
      SELECT hero1 AS hero, winner FROM matches
      UNION ALL
      SELECT hero2 AS hero, winner FROM matches
    ) AS combined
    GROUP BY hero
    ORDER BY wins DESC;
  `;

  try {
    const results = await allAsync(query);
    return { success: true, results };
  } catch (err) {
    console.error(err);
    throw { success: false, error: 'Failed to fetch overall hero stats.' };
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
  getOverallHeroStatsFromDB,
  deleteMatchLogByIdFromDB,
  getMatchesByHero
};
