const { Router } = require('express');
const excelReports = require ('../../controllers/reports');
const router = Router();

router.get('/order/:order_id', excelReports.generateOrderExcel);
router.post('/stockWarehouse', excelReports.generateStockExcel);
router.get('/request/:request_id', excelReports.generateRequestExcel);


module.exports = router;