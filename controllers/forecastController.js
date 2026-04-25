const Forecast        = require('../models/Forecast');
const Product         = require('../models/Product');
const ProductionOrder = require('../models/ProductionOrder');
const { safeUserId }  = require('../utils/helpers');

// GET /api/forecast?from=YYYY-MM-DD&to=YYYY-MM-DD
// defaults to today → 7 days out if no params given
exports.getForecasts = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.json({ success: true, data: [] });

    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to   = req.query.to   ? new Date(req.query.to)   : new Date(Date.now() + 7 * 864e5);
    to.setHours(23, 59, 59, 999);

    const forecasts = await Forecast.find({
      userId:       req.user.id,
      forecastDate: { $gte: from, $lte: to },
    }).populate('productId', 'name sku variant category').sort({ forecastDate: 1 });

    return res.json({ success: true, data: forecasts });
  } catch (err) { next(err); }
};

// POST /api/forecast — upsert a single forecast entry
exports.upsertForecast = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.status(403).json({ success: false, message: 'Read-only account. Register to save data.' });

    const { productId, forecastDate, forecastQty } = req.body;
    if (!productId || !forecastDate) {
      return res.status(400).json({ success: false, message: 'productId and forecastDate are required.' });
    }

    const forecast = await Forecast.findOneAndUpdate(
      { userId: req.user.id, productId, forecastDate: new Date(forecastDate) },
      { forecastQty: Number(forecastQty) || 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('productId', 'name sku variant');

    return res.json({ success: true, data: forecast });
  } catch (err) { next(err); }
};

// POST /api/forecast/generate
// pulls 30 days of order history per product, calculates a daily average,
// then applies a 10% growth factor and writes 7 days of forecasts
// not a proper ML model — just a simple heuristic that works well enough for planning
exports.generateForecast = async (req, res, next) => {
  try {
    const products = await Product.find({ userId: req.user.id, status: 'active' });
    if (!products.length) return res.json({ success: true, message: 'No active products found.', count: 0 });

    const past30Start = new Date(Date.now() - 30 * 864e5);

    const pastOrders = await ProductionOrder.aggregate([
      {
        $match: {
          userId:    req.user.id,
          createdAt: { $gte: past30Start },
          status:    { $in: ['completed', 'in_progress', 'pending'] },
        },
      },
      { $group: { _id: '$productId', totalQty: { $sum: '$quantity' }, count: { $sum: 1 } } },
    ]);

    // daily average = total over 30 days / 30
    const orderMap = {};
    pastOrders.forEach(o => { orderMap[o._id.toString()] = o.totalQty / 30; });

    const ops   = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    for (const product of products) {
      const avgDaily    = orderMap[product._id.toString()] || product.dailyTarget || 0;
      const forecastQty = Math.ceil(avgDaily * 1.1); // bump by 10% for growth

      for (let d = 0; d < 7; d++) {
        const fDate = new Date(today); fDate.setDate(fDate.getDate() + d);
        ops.push({
          updateOne: {
            filter: { userId: req.user.id, productId: product._id, forecastDate: fDate },
            update: { $set: { forecastQty } },
            upsert: true,
          },
        });
      }
    }

    const result = await Forecast.bulkWrite(ops);
    return res.json({ success: true, message: 'Forecast generated.', count: result.upsertedCount + result.modifiedCount });
  } catch (err) { next(err); }
};
