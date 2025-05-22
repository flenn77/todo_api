// src/middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createClient } = require("redis");

// 1) On crée et on connecte le client Redis
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on("error", err => console.error("Redis Client Error", err));
redisClient.connect().catch(err => {
  console.error("Impossible de connecter Redis pour le rate-limit:", err);
});

// 2) On installe le rate-limiter avec Redis comme store
const limiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute
  max: 101,               // 100 requêtes par IP par minute
  legacyHeaders: false,   // désactive X-RateLimit-*
  standardHeaders: true,  // active RateLimit-* headers
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: "rl:"         // (optionnel) préfixe des clés dans Redis
  })
});

module.exports = limiter;
