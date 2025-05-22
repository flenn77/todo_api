// src/db.js
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function initDB() {
  const db = await open({
    filename: "./todos.db",
    driver: sqlite3.Database
  });

  // Mode WAL pour une meilleure concurrence lecture/écriture
  await db.run("PRAGMA journal_mode = WAL;");
  // Attendre jusqu'à 5s si la base est verrouillée
  await db.run("PRAGMA busy_timeout = 5000;");

  // Créer la table si nécessaire
  await db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexation pour accélérer les requêtes filtrant sur 'done'
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_todos_done ON todos(done)
  `);

  return db;
}

module.exports = initDB;
