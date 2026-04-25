const ProductionOrder = require('../models/ProductionOrder');
const Product         = require('../models/Product');
const Forecast        = require('../models/Forecast');
const Inventory       = require('../models/Inventory');
const { safeUserId }  = require('../utils/helpers');

// builds a PO number like PO-2026-0042
async function nextOrderNumber(userId) {
  const year  = new Date().getFullYear();
  const count = await ProductionOrder.countDocuments({ userId });
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
}

// GET /api/orders?status=pending
exports.getOrders = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.json({ success: true, data: [] });

    const filter = { userId: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    const orders = await ProductionOrder.find(filter)
      .populate('productId', 'name sku variant category')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: orders });
  } catch (err) { next(err); }
};

// POST /api/orders — manually create a single order
exports.createOrder = async (req, res, next) => {
  try {
    const { productId, quantity, dueDate, status } = req.body;
    if (!productId || !quantity || !dueDate) {
      return res.status(400).json({ success: false, message: 'productId, quantity and dueDate are required.' });
    }

    const orderNumber = await nextOrderNumber(req.user.id);
    const order = await ProductionOrder.create({
      userId: req.user.id, orderNumber, productId,
      quantity: Number(quantity), dueDate: new Date(dueDate), status: status || 'pending',
    });
    await order.populate('productId', 'name sku variant');
    return res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
};

// POST /api/orders/generate
// looks at today's forecast vs current stock and creates orders to cover the gap
// rounds up to the nearest 10 to avoid tiny orders
exports.generateOrders = async (req, res, next) => {
  try {
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const forecasts = await Forecast.find({
      userId:       req.user.id,
      forecastDate: { $gte: today, $lt: tomorrow },
    });

    if (!forecasts.length) {
      return res.json({ success: true, message: 'No forecasts for today. Generate forecast first.', count: 0 });
    }

    const created = [];
    const dueDate = new Date(Date.now() + 7 * 864e5); // give 7 days to fulfil

    for (const fc of forecasts) {
      const inv   = await Inventory.findOne({ userId: req.user.id, productId: fc.productId });
      const stock = inv ? inv.stockQty : 0;
      const gap   = fc.forecastQty - stock;

      if (gap <= 0) continue; // stock's fine, skip

      const quantity    = Math.ceil(gap / 10) * 10;
      const orderNumber = await nextOrderNumber(req.user.id);

      const order = await ProductionOrder.create({
        userId: req.user.id, orderNumber, productId: fc.productId,
        quantity, dueDate, status: 'pending',
      });
      created.push(order);
    }

    return res.json({ success: true, message: `Generated ${created.length} order(s).`, count: created.length, data: created });
  } catch (err) { next(err); }
};

// PUT /api/orders/:id
exports.updateOrder = async (req, res, next) => {
  try {
    const order = await ProductionOrder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    ).populate('productId', 'name sku variant');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// DELETE /api/orders/:id
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await ProductionOrder.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, message: 'Order deleted.' });
  } catch (err) { next(err); }
};
