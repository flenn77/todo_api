// src/worker.js
const { Worker } = require('bullmq');
const { createClient } = require('redis');

async function main() {
  // 1) Connect to Redis
  const connection = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
  connection.on('error', err => console.error('Redis Client Error', err));
  await connection.connect();
  console.info(JSON.stringify({ level: 'info', message: 'Redis connected', timestamp: new Date().toISOString() }));

  // 2) Create a worker for the "todoQueue"
  const worker = new Worker(
    'todoQueue',
    async job => {
      console.info(JSON.stringify({ level: 'info', message: `Processing todo job`, jobId: job.id, data: job.data, timestamp: new Date().toISOString() }));
      // Simulate work (e.g., report generation)
      return Promise.resolve();
    },
    { connection }
  );

  // 3) Log job completion
  worker.on('completed', job => {
    console.info(JSON.stringify({ level: 'info', message: `Job completed`, jobId: job.id, timestamp: new Date().toISOString() }));
  });

  // 4) Log job failures
  worker.on('failed', (job, err) => {
    console.error(JSON.stringify({ level: 'error', message: `Job failed`, jobId: job.id, error: err.message, timestamp: new Date().toISOString() }));
  });

  console.info(JSON.stringify({ level: 'info', message: 'Worker started', timestamp: new Date().toISOString() }));
}

main().catch(err => {
  console.error(JSON.stringify({ level: 'error', message: 'Worker initialization failed', error: err.message, timestamp: new Date().toISOString() }));
  process.exit(1);
});
