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
                    // if (type === 'BAR_CONSUMPTION') {
                    //     return true;
                    // }
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

}

module.exports = WarehouseService;