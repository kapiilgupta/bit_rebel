// sits at the very end of the middleware chain in app.js
// 4-arg signature is how Express knows it's an error handler
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err.message);
  }

  const isAPI = req.originalUrl.startsWith('/api/');

  // bad ObjectId in URL params
  if (err.name === 'CastError') {
    const msg = 'Resource not found (invalid id).';
    return isAPI
      ? res.status(400).json({ success: false, message: msg })
      : res.redirect('/');
  }

  // duplicate key — e.g. same SKU or email
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const msg   = `That ${field} is already in use.`;
    return isAPI
      ? res.status(409).json({ success: false, message: msg })
      : res.redirect('/');
  }

  // mongoose schema validation failures
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map(e => e.message).join(', ');
    return isAPI
      ? res.status(400).json({ success: false, message: msg })
      : res.redirect('/');
  }

  // JWT issues — bad signature or expired
  if (err.name === 'JsonWebTokenError') {
    return isAPI
      ? res.status(401).json({ success: false, message: 'Invalid token.' })
      : res.redirect('/login');
  }
  if (err.name === 'TokenExpiredError') {
    return isAPI
      ? res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
      : res.redirect('/login');
  }

  // anything else — hide internal details from the user in prod
  const message = status < 500 ? err.message : 'Internal Server Error';
  return isAPI
    ? res.status(status).json({ success: false, message })
    : res.status(status).redirect('/');
};

module.exports = errorHandler;
