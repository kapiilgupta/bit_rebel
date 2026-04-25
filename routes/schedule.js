const express    = require('express');
const controller = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/',          controller.getSchedule);
router.post('/generate', controller.generateSchedule);

module.exports = router;
