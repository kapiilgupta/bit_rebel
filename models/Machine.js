const mongoose = require('mongoose');

const MachineSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:          { type: String, required: true, trim: true },
  type:          { type: String, default: 'General', trim: true },
  shiftMinutes:  { type: Number, default: 480 }, // 8h shift, scheduler uses this for capacity
  location:      { type: String, default: '' },
  isOperational: { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Machine', MachineSchema);
