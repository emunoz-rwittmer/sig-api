const Staff = require('../../../models/catalogs/staff.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Product = require('../../../models/operations/orders/product.models');
const productCalculations = require('../../../models/operations/orders/productCalculations.models');
const itemsRequest = require('../../../models/operations/yachtRequest/itemsRequest.models');
const LaundryYacht = require('../../../models/operations/yachtRequest/laundryYacht');
const PlacesYacht = require('../../../models/operations/yachtRequest/placesYacht');
const Request = require('../../../models/operations/yachtRequest/request.models');
const Utils = require('../../../utils/Utils');
const { Sequelize, Op, where } = require("sequelize");
const db = require('../../../utils/database');

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
                where: { type: "Yate" },
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
                            SELECT SUM(CASE 
                                WHEN  transactions.warehouse_to_id = ${warehouseId}
                                THEN transactions.quantity 
                                ELSE 0 
                            END)
                            FROM transactions
                            WHERE transactions.product_id = product.id
                        )
                    `), 'totalIncome'],
                    [Sequelize.literal(`
                    (
                        SELECT SUM(CASE 
                            WHEN transactions.type = 'Salida' AND transactions.warehouse_from_id = ${warehouseId} 
                            THEN transactions.quantity 
                            ELSE 0 
                        END)
                        FROM transactions
                        WHERE transactions.product_id = product.id
                    )
                `), 'totalOutcome']
                ],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'type'],
                    include: [{
                        model: PlacesYacht,
                        as: 'configurations',
                        attributes: ['name'],
                    }],
                }],
                order: [[{ model: Product, as: 'product' }, 'name', 'ASC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getTransactionsWarehouse(warehouseId, startDate, endDate, type) {
        try {

            let filters = {
                [Op.or]: [
                    { warehouseToId: warehouseId },
                    { warehouseFromId: warehouseId }
                ]
            };

            if (startDate && endDate) {
                filters.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
            }

            if (type) {
                filters.type = type;
            }

            const result = await Transaction.findAll({
                where: filters,
                order: [['createdAt', 'DESC']],
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
                    model: Staff,
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

    static async getItemsByWarehouse(warehouseId) {
        try {
            const result = await itemsWarehouse.findAll({
                where: { warehouseId },
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

    static async getRequestToWareHouse(warehouseId, group) {
        try {
            const result = await Request.findAll({
                where: { warehouseId, group },
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
                attributes: ['id', 'stock', 'order', 'quantity'],
                include: [{
                    model: PlacesYacht,
                    as: 'placeYacht',
                    attributes: ['name'],
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name'],
                    }, {
                        model: productCalculations,
                        as: 'configuration',
                        attributes: [
                            'sixteenPax',
                            'eighteenPax',
                            'twentyPax',
                            'twentyTwoPax',
                            'twentyFourPax',
                        ]
                    }]
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateStockLaundry(warehouseId) {
        const transaction = await db.transaction();
        try {
            const products = await LaundryYacht.findAll({ where: { warehouseId } })

            const transactionResults = await Promise.all(
                products.map(async (product) => {

                    const lastValue = await Transaction.findOne({
                        where: { 
                            productId: product.product_id, 
                            warehouseFromId: 2,  
                            warehouseToId: warehouseId 
                        },
                        order: [['createdAt', 'DESC']],
                        transaction, 
                    });

                    await Transaction.create({
                        productId: product.product_id,
                        userId: lastValue.userId,
                        warehouseFromId: warehouseId,
                        warehouseToId: 2,
                        quantity: parseInt(lastValue.quantity),
                        type: 'Entrada',
                    }, { transaction });

                    const stockToInstance = await Stock.findOne({
                         where: { productId: product.product_id, warehouseId: 2 },
                         transaction,
                    });

                    stockToInstance.quantity += parseInt(lastValue.quantity);
                    await stockToInstance.save({ transaction });

                    const stockToIWarehose = await Stock.findOne({
                        where: { productId: product.product_id, warehouseId: warehouseId },
                        transaction,
                   });
                   stockToIWarehose.quantity -= parseInt(lastValue.quantity);
                   await stockToIWarehose.save({ transaction });
                })
            );

            await transaction.commit();
            return transactionResults;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
}

module.exports = WarehouseService;