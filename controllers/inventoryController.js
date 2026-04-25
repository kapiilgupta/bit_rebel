const Inventory = require('../models/Inventory');
const Product   = require('../models/Product');
const { safeUserId } = require('../utils/helpers');

// GET /api/inventory
exports.getInventory = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.json({ success: true, data: [] });

    const inventory = await Inventory.find({ userId: req.user.id })
      .populate('productId', 'name sku category variant dailyTarget')
      .sort({ updatedAt: -1 });

    return res.json({ success: true, data: inventory });
  } catch (err) { next(err); }
};

// POST /api/inventory — upsert by productId so you can't accidentally create duplicates
exports.upsertInventory = async (req, res, next) => {
  try {
    const { productId, stockQty, reorderLevel } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required.' });

    const inv = await Inventory.findOneAndUpdate(
      { userId: req.user.id, productId },
      { stockQty: Number(stockQty) || 0, reorderLevel: Number(reorderLevel) || 50, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('productId', 'name sku variant');

    return res.json({ success: true, data: inv });
  } catch (err) { next(err); }
};

// PUT /api/inventory/:id — update by inventory document id
exports.updateInventory = async (req, res, next) => {
  try {
    const { stockQty, reorderLevel } = req.body;
    const inv = await Inventory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { stockQty, reorderLevel, updatedAt: new Date() },
      { new: true }
    ).populate('productId', 'name sku variant');

    if (!inv) return res.status(404).json({ success: false, message: 'Inventory record not found.' });
    return res.json({ success: true, data: inv });
  } catch (err) { next(err); }
};
