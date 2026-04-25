const Machine      = require('../models/Machine');
const ScheduleSlot = require('../models/ScheduleSlot');
const { safeUserId } = require('../utils/helpers');

// GET /api/machines
// also calculates today's utilization % for each machine based on scheduled slots
exports.getMachines = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.json({ success: true, data: [] });

    const machines = await Machine.find({ userId: req.user.id }).sort({ createdAt: 1 });

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const slots = await ScheduleSlot.find({
      userId:   req.user.id,
      slotDate: { $gte: today, $lt: tomorrow },
    });

    // tally up scheduled minutes per machine
    const slotMap = {};
    slots.forEach(s => {
      const key = s.machineId.toString();
      slotMap[key] = (slotMap[key] || 0) + (s.durationMinutes || 0);
    });

    const data = machines.map(m => {
      const scheduled  = slotMap[m._id.toString()] || 0;
      const utilization = m.shiftMinutes > 0
        ? Math.min(100, Math.round((scheduled / m.shiftMinutes) * 100))
        : 0;
      return { ...m.toObject(), scheduledMins: scheduled, utilization };
    });

    return res.json({ success: true, data });
  } catch (err) { next(err); }
};

// POST /api/machines
exports.createMachine = async (req, res, next) => {
  try {
    const uid = safeUserId(req.user.id);
    if (!uid) return res.status(403).json({ success: false, message: 'Read-only account. Register to add data.' });

    const { name, type, shiftMinutes, location } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Machine name is required.' });

    const machine = await Machine.create({ userId: req.user.id, name, type, shiftMinutes, location });
    return res.status(201).json({ success: true, data: machine });
  } catch (err) { next(err); }
};

// PUT /api/machines/:id — handles both full edits and toggling isOperational
exports.updateMachine = async (req, res, next) => {
  try {
    const machine = await Machine.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found.' });
    return res.json({ success: true, data: machine });
  } catch (err) { next(err); }
};

// DELETE /api/machines/:id
exports.deleteMachine = async (req, res, next) => {
  try {
    const machine = await Machine.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found.' });
    return res.json({ success: true, message: 'Machine deleted.' });
  } catch (err) { next(err); }
};
