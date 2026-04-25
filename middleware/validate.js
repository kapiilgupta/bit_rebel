// quick field validators to keep the controllers thin
// TODO: swap this out for zod or joi if the schema gets complex

// checks that required fields are present and non-empty
// usage: router.post('/login', validateBody(['username', 'password']), controller.login)
exports.validateBody = (fields) => (req, res, next) => {
  const missing = fields.filter(f => {
    const val = req.body[f];
    return val === undefined || val === null || String(val).trim() === '';
  });

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`,
    });
  }
  next();
};

// sanity-check the email format before we even touch the DB
exports.validateEmail = (req, res, next) => {
  const { email } = req.body;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }
  next();
};

// 8 chars minimum — nothing fancy, just the baseline
exports.validatePassword = (req, res, next) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }
  next();
};
