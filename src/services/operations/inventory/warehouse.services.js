const Staff = require('../../../models/catalogs/staff.models');
const Users = require('../../../models/catalogs/user.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Product = require('../../../models/operations/orders/product.models');
const productCalculations = require('../../../models/operations/orders/productCalculations.models');
const itemsRequest = require('../../../models/operations/yachtRequest/itemsRequest.models');
const Request = require('../../../models/operations/yachtRequest/request.models');
const Utils = require('../../../utils/Utils');
const { Sequelize, Op, where } = require("sequelize");


class WarehouseService {
    static async getAllWarehouses() {
        try {
            const result = await Warehouse.findAll({
                attributes: [
                    'id', 'name', 'location', 'type',
                    [Sequelize.fn('COUNT', Sequelize.col('stocks.id')), 'stockCount']
                ],
                include: [{
                    model: Stock,
                    as: 'stocks',
                    attributes: []
                }],
                group: ['id']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getAllWarehousesTypeYacht() {
        try {
            const result = await Warehouse.findAll({
                where: { type: "Yate"},
                attributes: [
                    'id', 'name', 'location', 'type',
                    [Sequelize.fn('COUNT', Sequelize.col('requests.id')), 'requestsCount']
                ],
                include: [{
                    model: Request,
                    as: 'requests',
                    attributes: []
                }],
                group: ['id']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getWarehouseById(id) {
        try {
            const result = await Warehouse.findOne({
                where: { id },
                attributes: ['id', 'name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getStockInWarehouse(warehouseId) {
        try {
            const result = await Stock.findAll({
                where: { warehouseId },
                attributes: ['quantity',

                    [Sequelize.literal(`
                    (
                        SELECT SUM(CASE WHEN transactions.type = 'Entrada' THEN transactions.quantity ELSE 0 END)
                        FROM transactions
                        WHERE transactions.product_id = product.id
                    )
                `), 'totalIncome'],
                    [Sequelize.literal(`
                    (
                        SELECT SUM(CASE WHEN transactions.type = 'Salida' THEN transactions.quantity ELSE 0 END)
                        FROM transactions
                        WHERE transactions.product_id = product.id
                    )
                `), 'totalOutcome']
                ],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name', 'sku'],
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getTransactionsWarehouse(warehouseId) {
        try {
            const result = await Transaction.findAll({
                where: {
                    [Op.or]:
                    {
                        warehouseToId: warehouseId,
                        warehouseFromId: warehouseId
                    }
                },
                order: [
                    ['createdAt', 'DESC']
                ],
                attributes: ['warehouseToId', 'type', 'quantity', 'createdAt'],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name']
                }, {
                    model: Warehouse,
                    as: 'warehouseTo',
                    attributes: ['name']
                }, {
                    model: Users,
                    as: 'responsible',
                    attributes: ['firstName', 'lastName']
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createWarehouse(Warehouse) {
        try {
            const result = await Warehouse.create(Warehouse);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateWarehouse(data) {
        try {
            const results = await Promise.all(data.map(async (item) => {
                const result = await itemsWarehouse.update({
                    product: item.product,
                    quantity: item.quantity,
                    originalQuantity: item.originalQuantity,
                },
                    {
                        where: { id: Utils.decode(item.id) }
                    });
                return result;
            }));
            return results;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async updateStatusWarehouse(id, status) {
        try {
            const result = await Warehouse.update({
                status
            }, {
                where: { id }
            });
            return result;
        } catch (error) {
            throw error;

        }
    }

    // Items by Warehouses

    static async getItemsByWarehouse(WarehouseId) {
        try {
            const result = await itemsWarehouse.findAll({
                where: { WarehouseId },
                attributes: ['id', 'sku', 'product', 'quantity', 'originalQuantity', 'status']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createItemsOfWarehouse(items) {
        try {
            const result = await itemsWarehouse.bulkCreate(items);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateStatusItemOfWarehouse(id) {
        try {
            const result = await itemsWarehouse.update({
                status: 'ingresado'
            }, {
                where: { id }
            });
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async deleteItem(itemId) {
        try {
            const result = await itemsWarehouse.destroy({
                where: { id: itemId }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

    //Yacht request

    static async getRequestToWareHouse(warehouseId) {
        try {
            const result = await Request.findAll({
                where: { warehouseId },
                attributes: [
                    'id', 'name', 'status', 'createdAt',
                    [Sequelize.fn('COUNT', Sequelize.col('requestItems.id')), 'itemsCount']
                ],
                include: [{
                    model: itemsRequest,
                    as: 'requestItems',
                    attributes: []
                }, {
                    model: Staff,
                    as: 'responsible',
                    attributes: ['id', 'firstName', 'lastName']
                }],
                group: ['id']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getItemsToRequest(requestId) {
        try {
            const result = await itemsRequest.findAll({
                where: { requestId },
                attributes: ['id', 'stock', 'order','productId'],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name'],
                    include: [{
                        model: productCalculations,
                        as: 'configurations',
                    }]
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = WarehouseService;