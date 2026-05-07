const Staff = require('../../../models/catalogs/staff.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Product = require('../../../models/operations/inventory/product.models');
const requestItems = require('../../../models/operations/yachtRequest/requestItems.models');
const LaundryYacht = require('../../../models/operations/yachtRequest/laundryYacht');
const Request = require('../../../models/operations/yachtRequest/request.models');
const { Sequelize, Op } = require("sequelize");
const db = require('../../../utils/database');
const Company = require('../../../models/catalogs/company.models');

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

    static async createWarehouse(data) {
        try {
            const result = await Warehouse.create(data);
            return result;
        } catch (error) {
            throw error;
        }
    }


    static async updateWarehouse(data, id) {
        try {
            const result = await Warehouse.update(data, {
                where: { id },
            });
            return result
        } catch (error) {
            console.log(error)
            throw error;
        }
    }


    static async deleteWarehouse(id) {
        try {
            const result = await Warehouse.destroy({
                where: { id }
            });
            if (result) {
                return 'resource deleted successfully'
            }
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

    // static async getStockInWarehouse(warehouseId) {
    //     try {
    //         const result = await Stock.findAll({
    //             where: { warehouseId },
    //             attributes: ['quantity',

    //                 [Sequelize.literal(`
    //                     (
    //                         SELECT SUM(CASE 
    //                             WHEN  transactions.warehouse_to_id = ${warehouseId}
    //                             THEN transactions.quantity 
    //                             ELSE 0 
    //                         END)
    //                         FROM transactions
    //                         WHERE transactions.product_id = product.id
    //                     )
    //                 `), 'totalIncome'],
    //                 [Sequelize.literal(`
    //                 (
    //                     SELECT SUM(CASE 
    //                         WHEN transactions.type = 'OUT' AND transactions.warehouse_from_id = ${warehouseId} 
    //                         THEN transactions.quantity 
    //                         ELSE 0 
    //                     END)
    //                     FROM transactions
    //                     WHERE transactions.product_id = product.id
    //                 )
    //             `), 'totalOutcome'],
    //                 [Sequelize.literal(`
    //                 (
    //                     SELECT SUM(CASE 
    //                         WHEN transactions.type = 'BAR_CONSUMPTION'
    //                         THEN transactions.quantity 
    //                         ELSE 0 
    //                     END)
    //                     FROM transactions
    //                     WHERE transactions.product_id = product.id
    //                 )
    //             `), 'totalBarConsumption']
    //             ],
    //             include: [{
    //                 model: Product,
    //                 as: 'product',
    //                 attributes: ['id', 'name', 'sku'],
    //             },
    //             {
    //                 model: Company,
    //                 as: 'company',
    //                 attributes: ['id', 'name'],
    //             }
    //             ],
    //             order: [[{ model: Product, as: 'product' }, 'name', 'ASC']]
    //         });

    //         console.log(result[0])
    //         return result;
    //     } catch (error) {
    //         throw error;
    //     }
    // }

    static async getStockProduct(id) {
        try {
            const result = await Stock.findOne({
                where: { id },
                attributes: ['id', 'productId', 'warehouseId', 'companyId', 'quantity', 'max', 'min'],
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: Warehouse,
                        as: 'warehouse',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Company,
                        as: 'company',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'type', 'presentationQuantity'],
                        include: [
                            {
                                model: Transaction,
                                as: 'transactions',
                                attributes: ['id', 'createdAt', 'warehouseFromId', 'warehouseToId', 'type', 'quantity', 'userId'],
                                include: [
                                    {
                                        model: Warehouse,
                                        as: 'warehouseTo',
                                        attributes: ['id', 'name']
                                    },
                                    {
                                        model: Warehouse,
                                        as: 'warehouseFrom',
                                        attributes: ['id', 'name']
                                    },
                                    {
                                        model: Staff,
                                        as: 'responsible',
                                        attributes: ['firstName', 'lastName']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            if (!result) return null;

            const plain = result.get({ plain: true });

            const { warehouseId, companyId } = plain;

            if (!plain?.product?.transactions) return plain;

            plain.product.transactions = plain.product.transactions
                .filter(({ warehouseFromId, warehouseToId, type }) => {
                    // Incluir transacciones BAR_CONSUMPTION (sin warehouse info)
                    if (type === 'BAR_CONSUMPTION' && (!warehouseFromId && !warehouseToId)) {
                        return true;
                    }
                    // Incluir transacciones normales que pertenecen a este warehouse
                    const isFromThisWarehouse = warehouseFromId === warehouseId;
                    const isToThisWarehouse = warehouseToId === warehouseId;
                    return isFromThisWarehouse || isToThisWarehouse;
                })
                .map((transaction) => {
                    const adjustedTransaction = { ...transaction };
                    
                    // Solo ajustar tipo si tiene warehouse info (no es BAR_CONSUMPTION)
                    if (transaction.warehouseFromId || transaction.warehouseToId) {
                        if (transaction.warehouseFromId === warehouseId) {
                            adjustedTransaction.type = 'OUT'; // Salida del warehouse
                        } else if (transaction.warehouseToId === warehouseId) {
                            adjustedTransaction.type = 'IN'; // Entrada al warehouse
                        }
                    }
                    // Si es BAR_CONSUMPTION, mantenerlo como está
                    
                    return adjustedTransaction;
                })
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return plain;

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
            const result = await Warehouse.findOne({
                where: { id: warehouseId },
                attributes: ['id', 'name'],
                include: [{
                    model: Request,
                    as: 'requests',
                    where: { group },
                    include: [{
                        model: requestItems,
                        as: 'requestItems',
                    }, {
                        model: Staff,
                        as: 'responsible',
                        attributes: ['id', 'firstName', 'lastName']
                    }]
                }],
                order: [
                    [{ model: Request, as: 'requests' }, 'createdAt', 'DESC']
                ]
            });

            return result;
        } catch (error) {
            throw error;
        }
    }


    static async getItemsToRequest(requestId) {
        try {
            const result = await requestItems.findAll({
                where: { requestId },
                attributes: ['id', 'stock', 'order', 'quantity'],
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