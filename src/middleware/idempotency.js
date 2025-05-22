// src/middleware/idempotency.js
const client = require("../services/redisClient");

module.exports = function idempotency(req, res, next) {
  const key = req.header("Idempotency-Key");
  if (!key) return next();

  client.get(key)
    .then(stored => {
      if (stored) {
        const { status, body } = JSON.parse(stored);
        return res.status(status).json(body);
      }
      // on intercepte la réponse
      const originalJson = res.json.bind(res);
      res.json = async body => {
        await client.setEx(key, 86400, JSON.stringify({
          status: res.statusCode,
          body
        }));
        return originalJson(body);
      };
      next();
    })
    .catch(next);
};
