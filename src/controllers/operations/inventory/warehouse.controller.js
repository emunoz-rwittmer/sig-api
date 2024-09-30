const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const Utils = require('../../../utils/Utils');

const getAllWarehouses = async (req, res) => {
    try {
        const result = await WarehouseService.getAllWarehouses();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getStockInWarehouse = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id);
        const warehouse = await WarehouseService.getWarehouseById(warehouseId);
        if (warehouse instanceof Object) {
            warehouse.dataValues.id = Utils.encode(warehouse.dataValues.id);
        }
        const result = await WarehouseService.getStockInWarehouse(warehouseId);
        res.status(200).json({ warehouse, result });
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getTransactionsWarehouse = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id);
        const warehouse = await WarehouseService.getWarehouseById(warehouseId);
        if (warehouse instanceof Object) {
            warehouse.dataValues.id = Utils.encode(warehouse.dataValues.id);
        }
        const result = await WarehouseService.getTransactionsWarehouse(warehouseId);
        result.map((x) => {
            if (warehouseId === x.warehouseToId) {
                x.dataValues.type = 'Entrada';
            }
        });
        res.status(200).json({ warehouse, result });
    } catch (error) {
        res.status(400).json(error.message)
    }
}




const WarehouseController = {
    getAllWarehouses,
    getStockInWarehouse,
    getTransactionsWarehouse

}
module.exports = WarehouseController