const { forEach } = require('../config/heroes');

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('matches.db');

db.run(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hero1 TEXT NOT NULL,
    hero2 TEXT NOT NULL,
    winner TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function logMatch(hero1, hero2, winner, callback) {
  const sql = 'INSERT INTO matches (hero1, hero2, winner) VALUES (?, ?, ?)';
  db.run(sql, [hero1, hero2, winner], (err) => {
    if (err) {
      return callback({ success: false, error: 'Failed to insert match record.' });
    }

    callback({ success: true });
  });
}

function getRecentMatches(callback) {
  const query = 'SELECT id, hero1, hero2, winner, DATE(timestamp) as date FROM matches WHERE timestamp >= date(\'now\', \'-15 days\') ORDER BY timestamp DESC';
  db.all(query, [], (err, matches) => {
    if (err) {
      return callback({ success: false, error: 'Failed to fetch match logs.' });
    } else {
      callback({ success: true, matches });
    }
  })
}

function deleteMatchLogById(id, callback) {
  const sql = 'DELETE FROM matches WHERE id = ?';
  db.run(sql, [id], (err) => {
    if (err) {
      return callback({ success: false, error: 'Failed to delete match record.' });
    }
    callback({ success: true });
  });
}

function getHeroMatches(hero, callback) {
  const query = 'SELECT hero1, hero2, winner FROM matches WHERE hero1 = ? OR hero2 = ?';
  db.all(query, [hero, hero], (err, matches) => {
    if (err) {
      return callback({ success: false, error: 'Failed to fetch match logs.' });
    } else {
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
      callback({ success: true, matches: finalResults });
    }
  })
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
  db,
  logMatch,
  getRecentMatches,
  deleteMatchLogById,
  getHeroMatches
};
