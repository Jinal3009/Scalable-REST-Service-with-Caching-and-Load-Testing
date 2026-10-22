const mongoose = require('mongoose');
const Product = require('./models/Product');
const redis = require('./redis');
const N = Number(process.env.SEED_COUNT) || 100000;
const cats = ['shoes', 'shirts', 'pants', 'hats', 'bags', 'watches', 'jackets', 'socks'];

(async () => {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/store');
  await Product.collection.drop().catch(() => {});
  await Product.init(); // recreates indexes unless INDEXES=false
  for (let i = 0; i < N; i += 5000) {
    const batch = Array.from({ length: Math.min(5000, N - i) }, (_, j) => ({
      name: `Product ${i + j} ${cats[(i + j) % cats.length]}`,
      category: cats[(i + j) % cats.length],
      price: Math.round(Math.random() * 20000) / 100,
      stock: Math.floor(Math.random() * 500),
      description: 'Lorem ipsum dolor sit amet '.repeat(5),
    }));
    await Product.insertMany(batch, { ordered: false });
    console.log(`seeded ${i + batch.length}/${N}`);
  }
  await redis.flushall();
  process.exit(0);
})();
