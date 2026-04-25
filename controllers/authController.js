const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// OTP store lives in memory for now — fine for dev, swap for Redis in production
const otpStore = new Map(); // email → { otp, expiresAt }

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(user) {
  return jwt.sign(
    { id: user._id || user.id, username: user.username, email: user.email, role: user.role, company: user.company },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function attachCookie(res, token) {
  res.cookie('fb_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   parseInt(process.env.COOKIE_MAX_AGE || '604800000', 10),
  });
}

// POST /api/auth/send-otp
exports.sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const otp = generateOTP();
    otpStore.set(email.toLowerCase(), { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min TTL

    // in dev just print it — no need for a real email service while testing locally
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n📧  OTP for ${email}: \x1b[33m${otp}\x1b[0m\n`);
    }

    // TODO: hook up Resend or Nodemailer here for production sends
    // await emailService.send({ to: email, subject: 'Your Factory Brain code', text: `Code: ${otp}` });

    return res.json({ success: true, message: 'Verification code sent.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-otp
exports.verifyOTP = (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const record = otpStore.get(email.toLowerCase());
    if (!record) {
      return res.status(400).json({ success: false, message: 'No code found. Please request a new one.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'Code expired. Please request a new one.' });
    }
    if (record.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Incorrect code. Please try again.' });
    }

    otpStore.delete(email.toLowerCase()); // one-time use
    return res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { email, username, password, company } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ success: false, message: 'Email, username, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    let existing;
    try {
      existing = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      });
    } catch (dbErr) {
      if (dbErr.name === 'MongooseError' || dbErr.name === 'MongoServerSelectionError' || dbErr.message?.includes('buffering')) {
        return res.status(503).json({ success: false, message: 'Database unavailable. Please configure MONGODB_URI in .env and restart.' });
      }
      throw dbErr;
    }

    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ success: false, message: `That ${field} is already registered.` });
    }

    const user = await User.create({
      email:    email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      company:  company || {},
      isVerified: true,
    });

    const token = signToken(user);
    attachCookie(res, token);

    return res.status(201).json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email or username already exists.' });
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const key = username.toLowerCase();

    // MongoDB lookup — accepts both username and email
    let user;
    try {
      user = await User.findOne({
        $or: [{ username: key }, { email: key }],
      }).select('+password');
    } catch (dbErr) {
      if (dbErr.name === 'MongooseError' || dbErr.name === 'MongoServerSelectionError' || dbErr.message?.includes('buffering')) {
        return res.status(503).json({ success: false, message: 'Database unavailable. Please configure MONGODB_URI in .env and restart.' });
      }
      throw dbErr;
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);
    attachCookie(res, token);
    return res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('fb_token', { httpOnly: true, sameSite: 'lax' });
  return res.json({ success: true, message: 'Logged out successfully.' });
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};
