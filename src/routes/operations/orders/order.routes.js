const { Router } = require('express');
const OrderController  = require ('../../../controllers/operations/orders/orders.controller');
const { uploadExcelFile } = require('../../../utils/uploadConfiguration');

const router = Router();

router.get('/',OrderController.getAllYachtWhitOrders);
router.get('/ordersByYacht/:yacht_id',OrderController.getOrdersByYacht);
router.post('/uploadOrder', uploadExcelFile, OrderController.uploadOrder);
router.post('/createOrder', uploadExcelFile, OrderController.createOrder);
router.get('/itemsByOrder/:order_id',OrderController.getItemsByOrder);
// router.get('/reportingByYacht/:yacht_id',OrderController.getReportingByYacht);
// router.get('/reportingByDepartament/:departament_id',OrderController.getReportingByDepartament);
// router.get('/reportingEvaluationsByCrew/:crew_id',OrderController.getReportingEvaluationsByCrew);
// router.post('/respondEvaluation',OrderController.respondEvaluation);



module.exports = router;