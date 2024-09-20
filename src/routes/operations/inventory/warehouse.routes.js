const { Router } = require('express');
const WarehouseController  = require ('../../../controllers/operations/inventory/warehouse.controller');
const router = Router();

router.get('/',WarehouseController.getAllWarehouses);
router.get('/stockInWareHouse/:warehouse_id',WarehouseController.getStockInWarehouse);
router.get('/:warehouse_id/transactions',WarehouseController.getTransactionsWarehouse);


module.exports = router;