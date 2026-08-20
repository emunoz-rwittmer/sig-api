const Product = require('../../../models/operations/inventory/product.models');
const LaundryYacht = require('../../../models/operations/yachtRequest/laundryYacht');
const db = require('../../../utils/database');
const ProductConfiguration = require('../../../models/operations/inventory/productConfiguration');
const Stock = require('../../../models/operations/inventory/stock.models');
const Company = require('../../../models/catalogs/company.models');
const { Sequelize, Op } = require('sequelize');
const StockHistory = require('../../../models/operations/inventory/stockHistory.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');

class ProductService {
    static async findProduct(sku) {
        try {
            const result = await Product.findOne({ where: { sku } });
            return result
        } catch (error) {
            throw error;
        }
    }

    static async getAll() {
        try {
            const result = await Product.findAll({
                attributes: ['id', 'name', 'sku', 'type', 'unit', 'presentationQuantity', 'active', 'createdAt'],
                include: [{
                    model: ProductConfiguration,
                    as: 'configurations',
                }],
                order: [['name', 'ASC']]

            });
            return result;
        } catch (error) {

            throw error;
        }
    }

    static async getProductsWithConfigurations() {
        try {
            const result = await ProductConfiguration.findAll({
                where: { active: true },
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name'],
                    include: [{
                        model: LaundryYacht,
                        as: 'wineries',
                        attributes: ['id', 'warehouseId']
                    }]
                }],
                order: [
                    ['name', 'ASC'],
                    [{ model: Product, as: 'product' }, 'name', 'ASC']
                ]
            });
            return result;
        } catch (error) {

            throw error;
        }
    }

    static async getProductById(id) {
        try {
            const result = await Product.findOne({
                where: { id },
                attributes: ['id', 'name', 'sku', 'type', 'unit', 'presentationQuantity', 'active'],
                include: [{
                    model: ProductConfiguration,
                    as: 'configurations',
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getProductsByWarehouse(warehouseId) {
        try {
            const result = await Stock.findAll({
                where: { warehouseId },
                attributes: ['id', 'productId', 'max', 'min', 'companyId', 'quantity',

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
                            WHEN transactions.type = 'OUT' AND transactions.warehouse_from_id = ${warehouseId} 
                            THEN transactions.quantity 
                            ELSE 0 
                        END)
                        FROM transactions
                        WHERE transactions.product_id = product.id
                    )
                `), 'totalOutcome']
                    ,
                    [Sequelize.literal(`
                    (
                        SELECT SUM(CASE 
                            WHEN transactions.type = 'BAR_CONSUMPTION' AND transactions.warehouse_from_id = ${warehouseId} 
                            THEN transactions.quantity 
                            ELSE 0 
                        END)
                        FROM transactions
                        WHERE transactions.product_id = product.id
                    )
                `), 'totalBarConsumption']
                ],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name', 'sku', 'type', 'unit', 'presentationQuantity'],
                    include: [{
                        model: ProductConfiguration,
                        as: 'configurations',
                        attributes: ['name'],
                    }],
                },
                {
                    model: Company,
                    as: 'company',
                    attributes: ['name'],
                }
                ],
                order: [[{ model: Product, as: 'product' }, 'name', 'ASC']]
            });

            const currentPlain = result.map(r => r.get({ plain: true }));
            return currentPlain;

        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async createProduct(data) {
        const transaction = await db.transaction();
        try {

            const product = await Product.findOne({
                where: { sku: data.sku },
                transaction
            });

            if (product) {
                throw new AppError(`El producto con el SKU: ${product.sku} ya existe`, 400);
            }

            const result = await Product.create(data, { transaction });

            if (Array.isArray(data.configurations) && data.configurations.length > 0) {
                const configurations = data.configurations.map(config => ({
                    ...config,
                    productId: result.id,
                }));

                await ProductConfiguration.bulkCreate(configurations, { transaction });
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }


    static async updateProduct(product, id) {
        const transaction = await db.transaction();

        try {
            const existing = await Product.findByPk(id, { transaction });
            if (!existing) {
                throw new AppError('Producto no encontrado', 404);
            }

            const result = await Product.update(
                {
                    name: product.name,
                    sku: product.sku,
                    type: product.type,
                    unit: product.unit,
                    presentationQuantity: product.presentationQuantity
                },
                {
                    where: { id },
                    transaction
                }
            );

            if (Array.isArray(product.configurations)) {

                const incomingConfigs = product.configurations;
                const incomingIds = incomingConfigs
                    .filter(cfg => cfg.id)
                    .map(cfg => cfg.id);

                await ProductConfiguration.destroy({
                    where: {
                        productId: id,
                        ...(incomingIds.length && { id: { [Op.notIn]: incomingIds } })
                    },
                    transaction
                });

                for (const config of incomingConfigs) {
                    if (config.id) {
                        await ProductConfiguration.update(
                            {
                                name: config.name,
                                group: config.group,
                                sixteenPax: config.sixteenPax,
                                eighteenPax: config.eighteenPax,
                                twentyPax: config.twentyPax,
                                twentyTwoPax: config.twentyTwoPax,
                                twentyFourPax: config.twentyFourPax,
                            },
                            {
                                where: { id: config.id },
                                transaction
                            }
                        );
                    } else {
                        await ProductConfiguration.create(
                            {
                                ...config,
                                productId: id
                            },
                            { transaction }
                        );
                    }
                }
            }

            await transaction.commit();
            return result
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }


    static async delete(productId) {
        try {
            const result = await Product.destroy({
                where: { id: productId }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

    static async switchConfirguration(data, id) {
        try {
            const result = await ProductConfiguration.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateStock(id, data) {
        const t = await db.transaction();

        try {
            const current = await Stock.findByPk(id, { transaction: t });

            if (!current) {
                throw new Error('Stock no encontrado');
            }

            const currentPlain = current.get({ plain: true });

            const hasChanges = Object.keys(data).some(key => {
                return data[key] !== currentPlain[key];
            });

            if (!hasChanges) {
                await t.rollback();
                return;
            }

            const product = await Product.findOne({
                where: { id: currentPlain.productId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            const normalizedQty = Quantity.normalizeQuantity(product, data.quantity);

            const hasQuantityChange =
                normalizedQty !== undefined &&
                normalizedQty !== currentPlain.quantity;

            let diff = 0;
            let diffNormal = 0;
            let newQuantity = currentPlain.quantity;

            if (hasQuantityChange) {
                diff = normalizedQty - currentPlain.quantity;
                newQuantity = normalizedQty;

                diffNormal = Quantity.viewCorrectQuantity(product, diff)
            }

            await Stock.update({
                ...data,
                quantity: normalizedQty
            }, {
                where: { id },
                transaction: t
            });

            await StockHistory.create({
                stockId: id,
                ...data
            }, { transaction: t });

            if (hasQuantityChange) {

                const isIncrease = diff > 0;

                await Transaction.create({
                    productId: currentPlain.productId,
                    userId: data.userId,
                    warehouseFromId: isIncrease ? null : currentPlain.warehouseId,
                    warehouseToId: isIncrease ? currentPlain.warehouseId : null,

                    quantity: Math.abs(diffNormal),
                    type: isIncrease ? 'IN' : 'OUT',

                }, { transaction: t });
            }

            await t.commit();

            return { message: 'Actualizado correctamente' };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

}

module.exports = ProductService;