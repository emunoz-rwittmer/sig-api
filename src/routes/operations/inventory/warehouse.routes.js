const { Router } = require('express');
const WarehouseController  = require ('../../../controllers/operations/inventory/warehouse.controller');
const router = Router();

router.get('/',WarehouseController.getAllWarehouses);
router.post('/', WarehouseController.createWarehouse);
router.put('/:warehouse_id', WarehouseController.updateWarehouse);
router.delete('/:warehouse_id', WarehouseController.deleteWarehouse);
//stock
router.get('/:stock_id/stockProduct',WarehouseController.getStockProduct);


module.exports = router;