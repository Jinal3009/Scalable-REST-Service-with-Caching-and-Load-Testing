const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const os = require('os');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('./redis');

const app = express();
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => { res.set('X-Instance', os.hostname()); next(); });

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 100000,
  standardHeaders: true,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
}));

app.get('/health', (req, res) => res.json({ ok: true, instance: os.hostname() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.message });
});
module.exports = app;
