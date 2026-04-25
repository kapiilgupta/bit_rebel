const Product   = require('../models/Product');
const Inventory = require('../models/Inventory');
const { safeUserId } = require('../utils/helpers');

// GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.json({ success: true, data: [] });
    const products = await Product.find({ userId: uid }).sort({ createdAt: -1 });
    return res.json({ success: true, data: products });
  } catch (err) { next(err); }
};

// POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.status(403).json({ success: false, message: 'Read-only account. Please register to add data.' });

    const { name, sku, category, dailyTarget, unitCost, leadTimeDays, variant, machineMinutesPerUnit, status } = req.body;
    if (!name || !sku) {
      return res.status(400).json({ success: false, message: 'Name and SKU are required.' });
    }

    const product = await Product.create({
      userId: req.user.id, name, sku, category, dailyTarget, unitCost,
      leadTimeDays, variant, machineMinutesPerUnit, status,
    });

    // auto-create an empty inventory record so the product shows up on the inventory page straight away
    await Inventory.create({ userId: req.user.id, productId: product._id, stockQty: 0, reorderLevel: 50 });

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'SKU already exists.' });
    next(err);
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// DELETE /api/products/:id — also wipes related inventory
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    await Inventory.deleteMany({ productId: req.params.id });
    return res.json({ success: true, message: 'Product deleted.' });
  } catch (err) { next(err); }
};
