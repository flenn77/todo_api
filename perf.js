// perf.js
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
(async () => {
  const db = await open({ filename: './todos.db', driver: sqlite3.Database });
  const runs = 1000;
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t0 = process.hrtime.bigint();
    await db.all('SELECT * FROM todos WHERE done = 0');
    const t1 = process.hrtime.bigint();
    times.push(Number(t1 - t0)); // nanosecondes
  }
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(runs * 0.50)];
  const p95 = times[Math.floor(runs * 0.95)];
  const p99 = times[Math.floor(runs * 0.99)];
  console.log(`p50=${p50/1e6}ms p95=${p95/1e6}ms p99=${p99/1e6}ms`);
  process.exit(0);
})();
