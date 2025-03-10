const { Router } = require('express');
const StrategyController  = require ('../../../controllers/operations/indicators/strategy.controller');

const router = Router();

router.get('/',StrategyController.getAllStrategys);
router.get('/:level_id',StrategyController.getStrategy);
router.post('/',StrategyController.createStrategy);
router.put('/:level_id',StrategyController.updateStrategy);
router.delete('/:level_id',StrategyController.deleteStrategy);


module.exports = router;