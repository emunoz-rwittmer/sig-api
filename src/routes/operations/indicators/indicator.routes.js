const { Router } = require('express');
const IndicatorController  = require ('../../../controllers/operations/indicators/indicators.controller');

const router = Router();

router.get('/',IndicatorController.getAllDepartamentsWhitIndicators);
router.get('/indicatorsByDepartament/:departament_id',IndicatorController.getIndicatorsByDepartament);
router.get('/indicatorsByDepartament/:departament_id/tabulations',IndicatorController.getTabulationsyDepartament);
router.get('/:indicator_id',IndicatorController.getIndicatorById);
router.get('/formulas/indicators',IndicatorController.getFormulas);
router.post('/createIndicator', IndicatorController.createIndicator);
router.put('/updateIndicator/:indicator_id', IndicatorController.updateIndicator);
router.delete('/:indicator_id', IndicatorController.deleteIndicator);
//indicators staffs 
router.get('/staffs/:staff_id',IndicatorController.getProcesStaffs);
router.get('/:process_id/staffs',IndicatorController.getAllStaffsByProces);
router.post('/:process_id/assingStaff',IndicatorController.assignStaff);
router.delete('/:process_id/process/:staff_id',IndicatorController.deleteStafft);
//create tabulations
router.post('/tabulations/createTabulation', IndicatorController.createTabulation);
router.get('/tabulations/:indicator_id',IndicatorController.getTabulationsByIndicator);
module.exports = router;