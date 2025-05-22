// src/services/queue.service.js
const { Queue } = require('bullmq');
const connection = {
  host: 'redis',
  port: 6379,
  // url from REDIS_URL env if besoin
};

const todoQueue = new Queue('todoQueue', { connection });

module.exports = todoQueue;
