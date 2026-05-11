const { Console } = require('escpos');
const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const RequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');
const Utils = require('../../../utils/Utils');

const getAllWarehouses = async (req, res) => {
    try {
        let result = await WarehouseService.getAllWarehouses();
        const rol = req.userRol
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

const createWarehouse = async (req, res) => {
    try {
        const data = req.body;
        await WarehouseService.createWarehouse(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateWarehouse = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id);
        const data = req.body;
        delete data.id
        await WarehouseService.updateWarehouse(data, warehouseId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteWarehouse = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id);
        const result = await WarehouseService.deleteWarehouse(warehouseId);
        res.status(200).json({ data: result })
    } catch (error) {

        res.status(400).json(error.message);
    }
}


const getStockProduct = async (req, res) => {
    try {
        const stockId = Utils.decode(req.params.stock_id);
        const result = await WarehouseService.getStockProduct(stockId);
        result.quantity = await Utils.viewCorrectQuantity(result.product, result.quantity)
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message || 'Error inesperado');
    }
};

const WarehouseController = {
    getAllWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    getStockProduct,
}
module.exports = WarehouseController