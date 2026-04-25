const express    = require('express');
const controller = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateBody, validateEmail, validatePassword } = require('../middleware/validate');

const router = express.Router();

router.post('/send-otp',   validateEmail,                                     controller.sendOTP);
router.post('/verify-otp', validateBody(['email', 'otp']),                    controller.verifyOTP);
router.post('/register',   validateBody(['email', 'username', 'password']),
                           validateEmail,
                           validatePassword,                                  controller.register);
router.post('/login',      validateBody(['username', 'password']),            controller.login);
router.post('/logout',                                                        controller.logout);
router.get('/me',          protect,                                           controller.getMe);

module.exports = router;
