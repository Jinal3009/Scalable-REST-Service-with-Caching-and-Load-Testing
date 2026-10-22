const redis = require('../redis');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cache-aside + version-based invalidation + stampede lock.
const cache = (ttl = 60) => async (req, res, next) => {
  if (process.env.CACHE_ENABLED === 'false') { res.set('X-Cache', 'OFF'); return next(); }
  try {
    const ver = (await redis.get('products:ver')) || '0';
    const key = `cache:${ver}:${req.originalUrl}`;
    const serve = (body) => { res.set('X-Cache', 'HIT'); return res.type('json').send(body); };

    const hit = await redis.get(key);
    if (hit) return serve(hit);

    // Only one request rebuilds a missing key; others wait briefly for it.
    const leader = await redis.set(`lock:${key}`, '1', 'EX', 5, 'NX');
    if (!leader) {
      for (let i = 0; i < 20; i++) {
        await sleep(50);
        const h = await redis.get(key);
        if (h) return serve(h);
      }
    }
    const send = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) redis.set(key, JSON.stringify(body), 'EX', ttl).catch(() => {});
      res.set('X-Cache', 'MISS');
      return send(body);
    };
    next();
  } catch (e) { next(); } // Redis down? Fall through to the DB.
};

// Bumping the version orphans every old key at once; TTL/LRU cleans them up.
cache.invalidate = () => redis.incr('products:ver');
module.exports = cache;
