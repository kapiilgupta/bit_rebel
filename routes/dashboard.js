const express    = require('express');
const controller = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/summary',    controller.getSummary);         // top-level KPI numbers
router.get('/production', controller.getProductionTable); // forecast vs stock table
router.get('/schedule',   controller.getSchedule);        // machine timeline / Gantt
router.get('/alerts',     controller.getAlerts);          // low-stock alerts
router.get('/inventory',  controller.getInventory);       // inventory status cards

module.exports = router;
