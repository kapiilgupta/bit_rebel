const ScheduleSlot    = require('../models/ScheduleSlot');
const Machine         = require('../models/Machine');
const ProductionOrder = require('../models/ProductionOrder');
const Product         = require('../models/Product');
const { safeUserId }  = require('../utils/helpers');

// GET /api/schedule?date=YYYY-MM-DD
exports.getSchedule = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.json({ success: true, data: [] });

    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const slots = await ScheduleSlot.find({
      userId:   req.user.id,
      slotDate: { $gte: date, $lt: nextDay },
    })
      .populate({ path: 'machineId', select: 'name type shiftMinutes' })
      .populate({
        path: 'productionOrderId',
        select: 'orderNumber quantity status',
        populate: { path: 'productId', select: 'name sku variant' },
      })
      .sort({ startMinute: 1 });

    return res.json({ success: true, data: slots });
  } catch (err) { next(err); }
};

// POST /api/schedule/generate
// Simple round-robin: walks through pending orders sorted by due date,
// and fills machine capacity in rotation. Not optimal but works well enough.
exports.generateSchedule = async (req, res, next) => {
  try {
    const scheduleDate = req.body.date ? new Date(req.body.date) : new Date();
    scheduleDate.setHours(0, 0, 0, 0);

    const machines = await Machine.find({ userId: req.user.id, isOperational: true });
    if (!machines.length) {
      return res.json({ success: false, message: 'No operational machines. Add machines first.' });
    }

    // earliest due date first — prioritise what's most urgent
    const orders = await ProductionOrder.find({ userId: req.user.id, status: 'pending' })
      .populate('productId', 'machineMinutesPerUnit')
      .sort({ dueDate: 1 });

    if (!orders.length) {
      return res.json({ success: true, message: 'No pending orders to schedule.', count: 0 });
    }

    // clear existing slots for this date so we start fresh
    const nextDay = new Date(scheduleDate);
    nextDay.setDate(nextDay.getDate() + 1);
    await ScheduleSlot.deleteMany({
      userId:   req.user.id,
      slotDate: { $gte: scheduleDate, $lt: nextDay },
    });

    // track remaining minutes per machine
    const machineCapacity = {};
    machines.forEach(m => { machineCapacity[m._id.toString()] = m.shiftMinutes; });

    const slotsToInsert = [];
    let machineIdx = 0;

    for (const order of orders) {
      const minsPerUnit = order.productId?.machineMinutesPerUnit || 10;
      let remaining     = minsPerUnit * order.quantity;

      // try to fit the order across machines — bail after 2 full rotations to avoid infinite loops
      let attempts = 0;
      while (remaining > 0 && attempts < machines.length * 2) {
        const machine = machines[machineIdx % machines.length];
        const mKey    = machine._id.toString();
        const cap     = machineCapacity[mKey];

        if (cap <= 0) { machineIdx++; attempts++; continue; }

        const allocated = Math.min(remaining, cap);
        const startMin  = machine.shiftMinutes - cap;

        slotsToInsert.push({
          userId:            req.user.id,
          productionOrderId: order._id,
          machineId:         machine._id,
          slotDate:          scheduleDate,
          startMinute:       startMin,
          durationMinutes:   allocated,
        });

        machineCapacity[mKey] -= allocated;
        remaining -= allocated;
        machineIdx++;
        attempts++;
      }
    }

    if (slotsToInsert.length) {
      await ScheduleSlot.insertMany(slotsToInsert);
    }

    return res.json({
      success: true,
      message: `Schedule generated: ${slotsToInsert.length} slot(s) created.`,
      count:   slotsToInsert.length,
    });
  } catch (err) { next(err); }
};
