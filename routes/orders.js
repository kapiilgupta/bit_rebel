const express    = require('express');
const controller = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/',          controller.getOrders);
router.post('/',         controller.createOrder);
router.post('/generate', controller.generateOrders);
router.put('/:id',       controller.updateOrder);
router.delete('/:id',    controller.deleteOrder);

module.exports = router;
