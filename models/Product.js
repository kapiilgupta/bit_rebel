const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  sku:         { type: String, required: true, trim: true, uppercase: true },
  category:    { type: String, default: 'General', trim: true },
  dailyTarget: { type: Number, default: 0 },
  unitCost:    { type: Number, default: 0 },
  leadTimeDays:{ type: Number, default: 1 },
  variant:     { type: String, default: '' },
  machineMinutesPerUnit: { type: Number, default: 10 }, // used by the scheduler to estimate slot duration
  status:      { type: String, enum: ['active', 'discontinued', 'draft'], default: 'active' },
  createdAt:   { type: Date, default: Date.now },
});

// SKU must be unique within a user's catalog, but two different users can share the same SKU
ProductSchema.index({ userId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', ProductSchema);
