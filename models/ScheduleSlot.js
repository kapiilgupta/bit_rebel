const mongoose = require('mongoose');

const ScheduleSlotSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productionOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
  machineId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true },
  slotDate:          { type: Date, required: true },
  startMinute:       { type: Number, default: 0 },  // minutes from midnight (e.g. 480 = 8am)
  durationMinutes:   { type: Number, default: 60 },
  createdAt:         { type: Date, default: Date.now },
});

// querying by date is the most common pattern on the schedule page
ScheduleSlotSchema.index({ userId: 1, slotDate: 1 });

module.exports = mongoose.model('ScheduleSlot', ScheduleSlotSchema);
