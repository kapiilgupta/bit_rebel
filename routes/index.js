const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// public pages — redirect to dashboard if already logged in
router.get('/', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('landing', { title: 'Factory Brain — Production Planning, Done for You' });
});
router.get('/auth', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('auth', { title: 'Get Started — Factory Brain' });
});
router.get('/signup', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('signup', { title: 'Create Account — Factory Brain' });
});
router.get('/login', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Login — Factory Brain', redirect: req.query.redirect || '/dashboard' });
});

// helper to keep the protected routes DRY
const P = (page, title, view) => [
  protect,
  (req, res) => res.render(view || page, { title: `${title} — Factory Brain`, user: req.user, page }),
];

router.get('/products',   ...P('products',   'Products'));
router.get('/forecast',   ...P('forecast',   'Forecast'));
router.get('/planning',   ...P('planning',   'Production Planning'));
router.get('/scheduling', ...P('scheduling', 'Machine Scheduling'));
router.get('/inventory',  ...P('inventory',  'Inventory'));
router.get('/machines',   ...P('machines',   'Machines'));
router.get('/alerts',     ...P('alerts',     'Alerts'));
router.get('/settings',   ...P('settings',   'Settings'));

// dashboard gets a greeting based on time of day
router.get('/dashboard', protect, (req, res) => {
  res.render('dashboard', {
    title:    'Dashboard — Factory Brain',
    user:     req.user,
    page:     'dashboard',
    greeting: getGreeting(),
  });
});

router.get('/logout', (req, res) => {
  res.clearCookie('fb_token', { httpOnly: true, sameSite: 'lax' });
  res.redirect('/');
});

// anything not matched above just bounces back to home
router.use((req, res) => res.status(404).redirect('/'));

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

module.exports = router;
