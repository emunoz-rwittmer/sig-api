const { Router } = require('express');
const WarehouseController  = require ('../../../controllers/operations/inventory/warehouse.controller');
const { uploadExcelFile } = require('../../../utils/uploadConfiguration');

const router = Router();

router.get('/',WarehouseController.getAllWarehouses);
router.get('/stockInWareHouse/:warehouse_id',WarehouseController.getStockInWarehouse);
// router.post('/uploadWarehouse', uploadExcelFile, WarehouseController.uploadWarehouse);
// router.post('/createWarehouse', uploadExcelFile, WarehouseController.createWarehouse);
// router.put('/updateStatusWarehouse/:Warehouse_id', WarehouseController.updateStatusWarehouse);


// ITEMS Warehouse
// router.get('/itemsByWarehouse/:Warehouse_id',WarehouseController.getItemsByWarehouse);
// router.put('/updateItemsWarehouse/:Warehouse_id', uploadExcelFile, WarehouseController.updateWarehouse);
// router.delete('/deleteItem/:item_id', WarehouseController.deleteItem);

// router.get('/reportingByYacht/:yacht_id',WarehouseController.getReportingByYacht);
// router.get('/reportingByDepartament/:departament_id',WarehouseController.getReportingByDepartament);
// router.get('/reportingEvaluationsByCrew/:crew_id',WarehouseController.getReportingEvaluationsByCrew);
// router.post('/respondEvaluation',WarehouseController.respondEvaluation);



module.exports = router;