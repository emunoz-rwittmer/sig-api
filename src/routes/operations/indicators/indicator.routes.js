const { Router } = require('express');
const IndicatorController  = require ('../../../controllers/operations/indicators/indicators.controller');

const router = Router();

router.get('/',IndicatorController.getAllDepartamentsWhitIndicators);
router.get('/indicatorsByDepartament/:departament_id',IndicatorController.getIndicatorsByDepartament);
router.get('/indicatorsByDepartament/:departament_id/tabulations',IndicatorController.getTabulationsyDepartament);
router.get('/:indicator_id',IndicatorController.getIndicatorById);
router.get('/formulas/indicators',IndicatorController.getFormulas);
router.post('/createIndicator', IndicatorController.createIndicator);
router.delete('/:indicator_id', IndicatorController.deleteIndicator);

module.exports = router;