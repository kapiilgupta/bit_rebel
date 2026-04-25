const Product         = require('../models/Product');
const Inventory       = require('../models/Inventory');
const Machine         = require('../models/Machine');
const Forecast        = require('../models/Forecast');
const ProductionOrder = require('../models/ProductionOrder');
const ScheduleSlot    = require('../models/ScheduleSlot');
const { safeUserId }  = require('../utils/helpers');

// builds a start/end range for "today" — reused across several endpoints
function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET /api/dashboard/summary
exports.getSummary = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.json({ success: true, data: { demandToday: 0, plannedUnits: 0, machinesActive: 0, machinesTotal: 0, alertCount: 0 } });

    const { start, end } = todayRange();

    // total forecast demand for today across all products
    const demandAgg = await Forecast.aggregate([
      { $match: { userId: uid, forecastDate: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$forecastQty' } } },
    ]);
    const demandToday = demandAgg[0]?.total || 0;

    // units already queued in pending or in-progress orders
    const plannedAgg = await ProductionOrder.aggregate([
      { $match: { userId: uid, status: { $in: ['pending', 'in_progress'] } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    const plannedUnits = plannedAgg[0]?.total || 0;

    const [machinesActive, machinesTotal] = await Promise.all([
      Machine.countDocuments({ userId: uid, isOperational: true }),
      Machine.countDocuments({ userId: uid }),
    ]);

    // count products where we don't have enough stock to meet today's forecast
    const forecasts = await Forecast.find({ userId: uid, forecastDate: { $gte: start, $lte: end } });
    let alertCount = 0;
    for (const fc of forecasts) {
      const inv = await Inventory.findOne({ userId: uid, productId: fc.productId });
      if (!inv || inv.stockQty < fc.forecastQty) alertCount++;
    }

    return res.json({ success: true, data: { demandToday, plannedUnits, machinesActive, machinesTotal, alertCount } });
  } catch (err) { next(err); }
};

// GET /api/dashboard/production
exports.getProductionTable = async (req, res, next) => {
  try {
    const { start, end } = todayRange();
    const uid = req.user.id;

    const forecasts = await Forecast.find({ userId: uid, forecastDate: { $gte: start, $lte: end } })
      .populate('productId', 'name sku variant');

    const rows = await Promise.all(forecasts.map(async fc => {
      const inv      = await Inventory.findOne({ userId: uid, productId: fc.productId });
      const stock    = inv?.stockQty   || 0;
      const forecast = fc.forecastQty  || 0;
      const required = Math.max(0, forecast - stock);

      const ordersAgg = await ProductionOrder.aggregate([
        { $match: { userId: uid, productId: fc.productId, status: { $in: ['pending', 'in_progress'] } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      const planned = ordersAgg[0]?.total || 0;

      // simple traffic-light status — anything below 50% of forecast is a shortage
      let status = 'balanced';
      if (stock < forecast * 0.5) status = 'shortage';
      else if (stock < forecast)  status = 'low';

      return {
        product: fc.productId?.name || '—',
        variant: fc.productId?.variant || '—',
        sku:     fc.productId?.sku     || '—',
        forecast, stock, required, planned, status,
      };
    }));

    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/dashboard/schedule
exports.getSchedule = async (req, res, next) => {
  try {
    const { start, end } = todayRange();
    const uid = req.user.id;

    const slots = await ScheduleSlot.find({ userId: uid, slotDate: { $gte: start, $lte: end } })
      .populate('machineId', 'name shiftMinutes')
      .populate({ path: 'productionOrderId', select: 'quantity orderNumber', populate: { path: 'productId', select: 'name' } })
      .sort({ startMinute: 1 });

    const machineMap = {};
    slots.forEach(s => {
      const mName = s.machineId?.name || 'Unknown';
      if (!machineMap[mName]) {
        machineMap[mName] = { id: mName, shiftMinutes: s.machineId?.shiftMinutes || 480, blocks: [] };
      }
      const shiftMins = s.machineId?.shiftMinutes || 480;
      const widthPct  = Math.round((s.durationMinutes / shiftMins) * 100);
      machineMap[mName].blocks.push({
        label:       `${s.productionOrderId?.productId?.name || s.productionOrderId?.orderNumber || '—'} · ${s.productionOrderId?.quantity || 0}u`,
        width:       widthPct,
        color:       'blue',
        startMinute: s.startMinute,
      });
    });

    // fill remaining time as idle so the Gantt bar always reaches 100%
    const data = Object.values(machineMap).map(m => {
      const usedPct = m.blocks.reduce((a, b) => a + b.width, 0);
      if (usedPct < 100) m.blocks.push({ label: 'Idle', width: 100 - usedPct, color: 'idle' });
      return m;
    });

    return res.json({ success: true, data: data.length ? data : [] });
  } catch (err) { next(err); }
};

// GET /api/dashboard/alerts
exports.getAlerts = async (req, res, next) => {
  try {
    const { start, end } = todayRange();
    const uid = req.user.id;

    const forecasts = await Forecast.find({ userId: uid, forecastDate: { $gte: start, $lte: end } })
      .populate('productId', 'name sku');

    const alerts = [];
    for (const fc of forecasts) {
      const inv   = await Inventory.findOne({ userId: uid, productId: fc.productId });
      const stock = inv?.stockQty || 0;

      if (stock < fc.forecastQty * 0.5) {
        alerts.push({ id: fc._id, type: 'danger', title: `${fc.productId?.name} — Critical shortage`, desc: `Stock (${stock}) is below 50% of today's demand (${fc.forecastQty}).`, time: 'Today' });
      } else if (stock < fc.forecastQty) {
        alerts.push({ id: fc._id, type: 'warning', title: `${fc.productId?.name} — Low stock`, desc: `Stock (${stock}) is below today's forecast (${fc.forecastQty}).`, time: 'Today' });
      }
    }

    return res.json({ success: true, data: alerts.slice(0, 5) });
  } catch (err) { next(err); }
};

// GET /api/dashboard/inventory
exports.getInventory = async (req, res, next) => {
  try {
    const { start, end } = todayRange();
    const uid = req.user.id;

    const inventories = await Inventory.find({ userId: uid })
      .populate('productId', 'name sku variant dailyTarget')
      .sort({ updatedAt: -1 })
      .limit(6); // just top 6 for the dashboard widget

    const data = await Promise.all(inventories.map(async inv => {
      const fc       = await Forecast.findOne({ userId: uid, productId: inv.productId, forecastDate: { $gte: start, $lte: end } });
      const capacity = fc?.forecastQty || inv.productId?.dailyTarget || 1;
      const pct      = Math.min(100, Math.round((inv.stockQty / capacity) * 100));
      let status = 'good';
      if (pct < 30) status = 'low';
      else if (pct < 60) status = 'medium';
      return {
        product: inv.productId?.name || '—',
        variant: `${inv.productId?.variant || inv.productId?.sku || '—'}`,
        current: inv.stockQty, capacity, pct, status,
      };
    }));

    return res.json({ success: true, data });
  } catch (err) { next(err); }
};
