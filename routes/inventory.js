const express    = require('express');
const controller = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/',      controller.getInventory);
router.post('/',     controller.upsertInventory);
router.put('/:id',   controller.updateInventory);

module.exports = router;
