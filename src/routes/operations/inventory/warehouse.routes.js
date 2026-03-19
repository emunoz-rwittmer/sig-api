const { Router } = require('express');
const WarehouseController  = require ('../../../controllers/operations/inventory/warehouse.controller');
const router = Router();

router.get('/',WarehouseController.getAllWarehouses);
router.post('/', WarehouseController.createWarehouse);
router.put('/:warehouse_id', WarehouseController.updateWarehouse);
router.delete('/:warehouse_id', WarehouseController.deleteWarehouse);

router.get('/typeYacht',WarehouseController.getAllWarehousesTypeYacht);
router.get('/stockInWareHouse/:warehouse_id',WarehouseController.getStockInWarehouse);
router.get('/:stock_id/stockProduct',WarehouseController.getStockProduct);

//Yacht request 
router.get('/requestToWareHouse/:warehouse_id/:type',WarehouseController.getRequestToWareHouse);
router.get('/:warehouse_id/itemsByRequest/:request_id',WarehouseController.getItemsToRequest);
router.put('/updateStockLaundry/:warehouse_id',WarehouseController.updateStockLaundry);

module.exports = router;