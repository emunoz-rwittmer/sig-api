const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const RequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');
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
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getAllWarehousesTypeYacht = async (req, res) => {
    try {
        const result = await WarehouseService.getAllWarehousesTypeYacht();
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

const getRequestToWareHouse = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id);
        const warehouse = await WarehouseService.getWarehouseById(warehouseId);
        if (warehouse instanceof Object) {
            warehouse.dataValues.id = Utils.encode(warehouse.dataValues.id);
        }
        const result = await WarehouseService.getRequestToWareHouse(warehouseId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json({ warehouse, result });
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getItemsToRequest = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id);
        const requestId = Utils.decode(req.params.request_id);
        const warehouse = await WarehouseService.getWarehouseById(warehouseId);
        if (warehouse instanceof Object) {
            warehouse.dataValues.id = Utils.encode(warehouse.dataValues.id);
        }
        const request = await RequestService.getRequestById(requestId);
        if (request instanceof Object) {
            request.dataValues.id = Utils.encode(request.dataValues.id);
        }
        const result = await WarehouseService.getItemsToRequest(requestId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        warehouse.dataValues.request = request.dataValues.name
        warehouse.dataValues.status = request.dataValues.status
        res.status(200).json({ warehouse, result });
    } catch (error) {
        res.status(400).json(error.message)
    }
}




const WarehouseController = {
    getAllWarehouses,
    getAllWarehousesTypeYacht,
    getStockInWarehouse,
    getTransactionsWarehouse,
    getRequestToWareHouse,
    getItemsToRequest

}
module.exports = WarehouseController