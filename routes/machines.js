const express    = require('express');
const controller = require('../controllers/machineController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/',       controller.getMachines);
router.post('/',      controller.createMachine);
router.put('/:id',    controller.updateMachine);
router.delete('/:id', controller.deleteMachine);

module.exports = router;
