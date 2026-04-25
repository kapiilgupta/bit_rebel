const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// protect — blocks unauthenticated requests
// reads the JWT from the fb_token cookie, attaches user to req.user
const protect = async (req, res, next) => {
  const token = req.cookies?.fb_token;
  if (!token) return _unauthorized(req, res);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id:       decoded.id,
      username: decoded.username,
      email:    decoded.email,
      role:     decoded.role,
      company:  decoded.company,
    };
    return next();
  } catch (err) {
    res.clearCookie('fb_token');
    return _unauthorized(req, res);
  }
};

// optionalAuth — attaches req.user if the cookie is valid, but never blocks
// used on public pages (landing, login) to redirect already-logged-in users
const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.fb_token;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (_) {
    res.clearCookie('fb_token');
  }
  return next();
};

// requireRole — must be chained after protect
// usage: router.delete('/user/:id', protect, requireRole('admin'), handler)
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

function _unauthorized(req, res) {
  const isAPI = req.originalUrl.startsWith('/api/');
  if (isAPI) return res.status(401).json({ success: false, message: 'Not authenticated.' });
  return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

module.exports = { protect, optionalAuth, requireRole };
