const mongoose = require('mongoose');

const ProductionOrderSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderNumber: { type: String, required: true }, // format: PO-YYYY-XXXX
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  dueDate:     { type: Date, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  status:      { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  createdAt:   { type: Date, default: Date.now },
});

// order numbers are unique per user account
ProductionOrderSchema.index({ userId: 1, orderNumber: 1 }, { unique: true });

module.exports = mongoose.model('ProductionOrder', ProductionOrderSchema);
