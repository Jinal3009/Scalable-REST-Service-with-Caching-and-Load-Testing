const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0 },
  description: String,
}, { timestamps: true });

// INDEXES=false gives you the "before" benchmark
if (process.env.INDEXES !== 'false') {
  schema.index({ category: 1, _id: -1 });
  schema.index({ category: 1, price: 1 });
  schema.index({ name: 'text' });
}
module.exports = mongoose.model('Product', schema);
