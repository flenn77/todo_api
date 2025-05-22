// src/app.js
require('./observability');
const express = require('express');
const compression = require('compression');
const rateLimit = require('./middleware/rateLimiter');
const idempotency = require('./middleware/idempotency');
const cache = require('./middleware/cache');
const initDB = require('./db');
const { createLogger, format, transports } = require('winston');
const client = require('prom-client');

// Logger JSON structuré
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [ new transports.Console() ]
});

const app = express();

// GZIP + JSON parser
app.use(compression({ threshold: 0 }));
app.use(express.json());

// 1) Default metrics (CPU, heap, etc.)
client.collectDefaultMetrics();

// 2) Nos compteurs custom
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP reçues',
  labelNames: ['method', 'route', 'status_code']
});
const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Nombre total de requêtes HTTP ayant renvoyé une erreur (status >= 400)',
  labelNames: ['method', 'route', 'status_code']
});
// 3) Histogramme de latence
const httpHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

// middleware qui mesure tout
app.use((req, res, next) => {
  const route = req.route?.path || req.path;
  const end = httpHistogram.startTimer({ method: req.method, route });
  res.on('finish', () => {
    const labels = { method: req.method, route, status_code: res.statusCode };
    // incrémente toujours le compteur global
    httpRequestsTotal.inc(labels);
    // si c’est une erreur HTTP
    if (res.statusCode >= 400) {
      httpRequestErrors.inc(labels);
    }
    // termine l’histogramme
    end({ status_code: res.statusCode });
  });
  next();
});

// Expose /metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Rate limiter
app.use(rateLimit);

// Health
app.get('/health', (_req, res) => res.json({ status: 'UP' }));

// Idempotency & cache
app.use(idempotency);
app.use(cache);

// Routes /todos + error handler + démarrage
initDB()
  .then(db => {
    app.use('/todos', require('./routes/todos')(db));
    app.use((err, _req, res, _next) => {
      logger.error(err.message, { stack: err.stack });
      res.status(err.status || 500).json({ error: err.message });
    });
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => logger.info(`Server listening on port ${PORT}`));
  })
  .catch(err => {
    logger.error('Impossible d’initialiser la base', { message: err.message, stack: err.stack });
    process.exit(1);
  });

module.exports = app;
