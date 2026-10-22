const mongoose = require('mongoose');
const app = require('./app');

(async () => {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/store', {
    maxPoolSize: 50, serverSelectionTimeoutMS: 10000,
  });
  const server = app.listen(3000, () => console.log('API listening on :3000'));
  const stop = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
})();
