const router = require('express').Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

// GET /api/products?category=&minPrice=&maxPrice=&q=&limit=20&cursor=<lastId>
router.get('/', cache(60), async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, q, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filter = {};
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) filter.$text = { $search: q };
    if (cursor) {
      if (!mongoose.isValidObjectId(cursor)) return res.status(400).json({ error: 'Bad cursor' });
      filter._id = { $lt: cursor };
    }

    const items = await Product.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ items, nextCursor: hasMore ? items[items.length - 1]._id : null });
  } catch (e) { next(e); }
});

router.get('/:id', cache(120), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
    const p = await Product.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.set('Cache-Control', 'public, max-age=30');
    res.json(p);
  } catch (e) { next(e); }
});

router.post('/', auth, async (req, res, next) => {
  try { const p = await Product.create(req.body); await cache.invalidate(); res.status(201).json(p); }
  catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
    if (!p) return res.status(404).json({ error: 'Not found' });
    await cache.invalidate(); res.json(p);
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try { await Product.findByIdAndDelete(req.params.id); await cache.invalidate(); res.status(204).end(); }
  catch (e) { next(e); }
});

module.exports = router;
