const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const Utils = require('../../../utils/Utils');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const getAllWarehouses = async (req, res, next) => {
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
        next(error);
    }
}

const createWarehouse = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.name) {
            throw new AppError('name es requerido', 400);
        }
        if (!data.location) {
            throw new AppError('location es requerido', 400);
        }
        if (!data.type) {
            throw new AppError('type es requerido', 400);
        }
        await WarehouseService.createWarehouse(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}

const updateWarehouse = async (req, res, next) => {
    try {
        const warehouseId = decodeId(req.params.warehouse_id, 'warehouse_id');
        const data = req.body;
        delete data.id
        await WarehouseService.updateWarehouse(data, warehouseId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteWarehouse = async (req, res, next) => {
    try {
        const warehouseId = decodeId(req.params.warehouse_id, 'warehouse_id');
        const result = await WarehouseService.deleteWarehouse(warehouseId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}


const getStockProduct = async (req, res) => {
    try {
        const stockId = Utils.decode(req.params.stock_id);
        const result = await WarehouseService.getStockProduct(stockId);
        result.quantity = await Quantity.viewCorrectQuantity(result.product, result.quantity)
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