const mongoose = require('mongoose');

const ForecastSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  forecastDate: { type: Date, required: true },
  forecastQty:  { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
});

// you can only have one forecast per product per day per user — upsert handles updates
ForecastSchema.index({ userId: 1, productId: 1, forecastDate: 1 }, { unique: true });

module.exports = mongoose.model('Forecast', ForecastSchema);
