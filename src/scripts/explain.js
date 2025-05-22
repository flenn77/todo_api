// src/scripts/explain.js
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

(async () => {
  const db = await open({
    filename: './todos.db',
    driver: sqlite3.Database
  });

  console.log('Plan d’exécution pour SELECT * FROM todos WHERE done = 0');
  const plan = await db.all(`
    EXPLAIN QUERY PLAN
    SELECT * FROM todos WHERE done = 0
  `);
  console.table(plan);
  process.exit(0);
})();
