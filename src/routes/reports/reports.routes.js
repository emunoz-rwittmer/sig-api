const { Router } = require('express');
const excelReports = require ('../../controllers/reports');
const router = Router();

router.get('/order/:order_id', excelReports.generateOrderExcel);
router.post('/stockWarehouse', excelReports.generateStockExcel);
router.get('/transactions/:warehouse_id', excelReports.generateTransactionsExcel);
router.get('/request/:request_id', excelReports.generateRequestExcel);

router.get('/evaluations/generalReport/:company_id', excelReports.generateGeneralReportEvaluations);
router.post('/evaluations/reportByEmployed', excelReports.generatReportEvaluationsByEmployed);

router.get('/comentCards/generateReport/:yacht_id', excelReports.generateReportComentCards);

module.exports = router;