const Product = require('../../../models/operations/inventory/product.models');
const LaundryYacht = require('../../../models/operations/yachtRequest/laundryYacht');
const db = require('../../../utils/database');
const ProductConfiguration = require('../../../models/operations/inventory/productConfiguration');
const Stock = require('../../../models/operations/inventory/stock.models');
const Company = require('../../../models/catalogs/company.models');
const { Sequelize, Op } = require('sequelize');
const StockHistory = require('../../../models/operations/inventory/stockHistory.models');

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
                attributes: ['id', 'name', 'sku'],
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
                attributes: ['id', 'name', 'sku'],
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
                    attributes: ['name', 'sku'],
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
            return result;
        } catch (error) {
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
                throw new Error(`El producto con el SKU: ${product.sku} ya existe`);
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
            const result = await Product.update(
                {
                    name: product.name,
                    sku: product.sku,
                    category: product.category
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
        const transaction = await db.transaction();

        try {
            const current = await Stock.findByPk(id, { transaction });
            if (!current) {
                throw new Error('Stock no encontrado');
            }

            const currentPlain = current.get({ plain: true });
            const hasChanges = Object.keys(data).some(key => {
                return data[key] !== currentPlain[key];
            });

            if (!hasChanges) {
                await transaction.rollback();
                return;
            }

            await Stock.update(data, {
                where: { id },
                transaction
            });

            await StockHistory.create({
                stockId: id,
                ...data
            }, { transaction });

            await transaction.commit();

            return { message: 'Actualizado correctamente' };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

}

module.exports = ProductService;