const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// embedded in User — didn't want a separate collection for something this small
const CompanySchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  industry:       { type: String, default: '' },
  numMachines:    { type: String, default: '' },
  productionType: { type: String, default: '' },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  username: {
    type:      String,
    required:  [true, 'Username is required'],
    unique:    true,
    trim:      true,
    lowercase: true,
    match:     [/^[a-z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'],
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type:      String,
    required:  [true, 'Email is required'],
    unique:    true,
    lowercase: true,
    trim:      true,
    match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type:      String,
    required:  [true, 'Password is required'],
    minlength: 8,
    select:    false, // never comes back in a query unless you explicitly ask for it
  },
  company:    CompanySchema,
  role:       { type: String, enum: ['admin', 'manager', 'viewer'], default: 'manager' },
  isVerified: { type: Boolean, default: false },
  lastLogin:  { type: Date },
  createdAt:  { type: Date, default: Date.now },
});

// hash before save — only runs when the password field actually changed
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt     = await bcrypt.genSalt(12);
  this.password  = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// strip the password before sending user data anywhere
UserSchema.methods.toSafeObject = function () {
  return {
    id:         this._id,
    username:   this.username,
    email:      this.email,
    company:    this.company,
    role:       this.role,
    isVerified: this.isVerified,
    lastLogin:  this.lastLogin,
    createdAt:  this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
