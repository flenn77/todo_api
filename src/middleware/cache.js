// src/middleware/cache.js
const { createClient } = require("redis");
const client = createClient({ url: process.env.REDIS_URL });
client.on("error", err => console.error("Redis Client Error", err));
(async () => { await client.connect(); })();

module.exports = async function cache(req, res, next) {
  // On ne cache que GET /todos
  if (req.method !== "GET" || req.path !== "/todos") {
    return next();
  }

  const key = "cache:todos";
  try {
    const cached = await client.get(key);
    if (cached) {
      // renvoyer la réponse mise en cache
      return res.json(JSON.parse(cached));
    }
    // sinon, intercepter res.json pour stocker le résultat
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      await client.setEx(key, 60, JSON.stringify(body)); // TTL 60s
      return originalJson(body);
    };
    next();
  } catch (err) {
    next(err);
  }
};
