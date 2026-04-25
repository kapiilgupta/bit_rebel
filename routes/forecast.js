const express    = require('express');
const controller = require('../controllers/forecastController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/',          controller.getForecasts);
router.post('/',         controller.upsertForecast);
router.post('/generate', controller.generateForecast);

module.exports = router;
