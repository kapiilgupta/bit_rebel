const express    = require('express');
const controller = require('../controllers/productController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/',     controller.getProducts);
router.post('/',    controller.createProduct);
router.put('/:id',  controller.updateProduct);
router.delete('/:id', controller.deleteProduct);

module.exports = router;
