const Product = require('../../../models/operations/orders/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const db = require('../../../utils/database');
const orderItems = require('../../../models/operations/orders/orderItems.models');
const Register = require('../../../models/operations/inventory/register.models');
const { where } = require('sequelize');

class TransactionService {

    static async productEntryInWarehouse(productData, stockData, transactionData, orderItemId) {
        const t = await db.transaction();

        try {

            const quantity = Number(stockData.quantity);

            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new Error('Invalid quantity');
            }

            let product = await Product.findOne({
                where: { sku: productData.sku },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!product) {
                product = await Product.create(productData, { transaction: t });
            }

            const whereStock = {
                productId: product.id,
                warehouseId: stockData.warehouseId,
                ...(stockData.companyId && { companyId: stockData.companyId })
            };

            let stock = await Stock.findOne({
                where: whereStock,
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (stock) {
                await stock.update(
                    { quantity: stock.quantity + quantity },
                    { transaction: t }
                );
            } else {
                await Stock.create(
                    {
                        ...stockData,
                        quantity,
                        productId: product.id
                    },
                    { transaction: t }
                );
            }

            const existsTransaction = await Transaction.findOne({
                where: { referenceId: transactionData.referenceId },
                transaction: t
            });

            if (existsTransaction) {
                throw new Error('Duplicate transaction');
            }

            await Transaction.create(
                {
                    ...transactionData,
                    productId: product.id,
                    quantity
                },
                { transaction: t }
            );

            const orderItem = await orderItems.findOne({
                where: { id: orderItemId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!orderItem) {
                throw new Error('Order item not found');
            }

            await orderItem.update(
                {
                    status: 'ingresado',
                    quantity
                },
                { transaction: t }
            );

            await t.commit();

            return {
                message: product
                    ? 'stock update and transaction register'
                    : 'product, stock and transaction created',
                orderItemId
            };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    static async transactionWarehouse(transactionData) {
        const { products, warehouseFromId, warehouseToId, userId, companyId, formattedCounter } = transactionData;
        const transaction = await db.transaction();

        try {

            const consolidatedProducts = Object.values(
                products.reduce((acc, product) => {
                    const quantity = Number(product.quantity);

                    if (!acc[product.id]) {
                        acc[product.id] = {
                            ...product,
                            quantity: 0
                        };
                    }

                    acc[product.id].quantity += quantity;
                    return acc;
                }, {})
            );

            const totalProducts = consolidatedProducts.reduce(
                (sum, p) => sum + p.quantity,
                0
            );

            const register = await Register.create({
                counter: formattedCounter,
                userId,
                companyId,
                products: totalProducts
            }, { transaction });

            for (const product of consolidatedProducts) {
                const { id: productId, name, quantity } = product;

                const stockFrom = await Stock.findOne({
                    where: {
                        productId,
                        warehouseId: warehouseFromId,
                        ...(companyId && { companyId })
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!stockFrom || stockFrom.quantity < quantity) {
                    throw new Error(`Stock insuficiente para ${name}`);
                }

                stockFrom.quantity -= quantity;
                await stockFrom.save({ transaction });

                const [stockTo] = await Stock.findOrCreate({
                    where: {
                        productId,
                        warehouseId: warehouseToId,
                        ...(companyId && { companyId })
                    },
                    defaults: { quantity: 0 },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                stockTo.quantity += quantity;
                await stockTo.save({ transaction });

                await Transaction.create({
                    productId,
                    userId,
                    warehouseFromId,
                    warehouseToId,
                    quantity,
                    type: 'Salida',
                    registerId: register.id
                }, { transaction });
            }

            await transaction.commit();
            return {
                success: true,
                message: 'Transacción completada correctamente.'
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Error en la transacción: ${error.message}`);
        }
    }

    static async incomeProductsInWarehouse(transactionData) {
        const { products, warehouseToId, companyId, userId } = transactionData;

        const transaction = await db.transaction();

        try {
            const transactionResults = await Promise.all(
                products.map(async (product) => {
                    const whereCondition = {
                        productId: product.id,
                        warehouseId: warehouseToId,
                        ...(companyId && { companyId: companyId })  // Agrega companyId solo si existe
                    };

                    const [stockToInstance] = await Stock.findOrCreate({
                        where: whereCondition,
                        defaults: { quantity: 0 },
                        transaction,
                    });

                    stockToInstance.quantity += parseInt(product.quantity);
                    await stockToInstance.save({ transaction });

                    return Transaction.create({
                        productId: product.id,
                        userId: userId,
                        warehouseToId: warehouseToId,
                        quantity: parseInt(product.quantity),
                        type: 'Entrada',
                    }, { transaction });
                })
            );

            await transaction.commit();
            return transactionResults;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async updateStatusItem(data, id) {
        try {
            const result = await orderItems.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async incomeProductsRegister(transactionData) {
        const { products, warehouseToId, companyId, userId, registerId, observations } = transactionData;

        const transaction = await db.transaction();

        try {

            const transactionResults = await Promise.all(products.map(async (product) => {
                const quantity = product.quantity || 0; // Asegúrate de que quantity tenga un valor numérico

                const stockFrom = await Stock.findOne({
                    where: {
                        productId: product.id,
                        warehouseId: 9,
                        companyId
                    },
                    transaction,
                });

                if (stockFrom.quantity < quantity) {
                    throw new Error(`Stock insuficiente para el producto en UIO-GPS: ${product.name}`);
                }

                stockFrom.quantity -= quantity;
                await stockFrom.save({ transaction });

                const whereToCondition = {
                    productId: product.id,
                    warehouseId: warehouseToId,
                };

                const [stockToInstance] = await Stock.findOrCreate({
                    where: whereToCondition,
                    defaults: { quantity: 0 },
                    transaction,
                });

                stockToInstance.quantity += quantity;
                await stockToInstance.save({ transaction });

                await Transaction.create({
                    productId: product.id,
                    userId,
                    warehouseFromId: 9,
                    warehouseToId,
                    quantity,
                    type: 'Salida',
                }, { transaction });

                await Register.update(
                    {
                        isResived: true,
                        observations,
                    },
                    {
                        where: { id: registerId },
                        transaction,
                    }
                );
            }));
            await transaction.commit();
            return transactionResults;
        } catch (error) {
            console.log(error)
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
}

module.exports = TransactionService;