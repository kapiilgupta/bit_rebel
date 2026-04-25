const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  stockQty:     { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 50 }, // alert fires when stock drops below this
  updatedAt:    { type: Date, default: Date.now },
});

// one inventory record per product per user — enforced at DB level
InventorySchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', InventorySchema);
