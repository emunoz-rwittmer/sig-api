const Product = require('../../../models/operations/orders/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const db = require('../../../utils/database');
const Request = require('../../../models/operations/yachtRequest/request.models');
const itemsRequest = require('../../../models/operations/yachtRequest/itemsRequest.models');
const itemsOrder = require('../../../models/operations/orders/itemsOrder.models');
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

            const orderItem = await itemsOrder.findOne({
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
        const suma = products.reduce((total, product) => total + parseInt(product.quantity), 0);

        try {
            // Crear el registro antes de `Promise.all`
            const register = await Register.create({
                counter: formattedCounter,
                userId,
                companyId,
                products: suma
            }, { transaction });

            await Promise.all(products.map(async (product) => {
                const quantity = parseInt(product.quantity);

                // Manejo de stock en la bodega de origen
                const whereFromCondition = {
                    productId: product.id,
                    warehouseId: warehouseFromId,
                    ...(companyId && { companyId })
                };

                const [stockFrom] = await Stock.findOrCreate({
                    where: whereFromCondition,
                    defaults: { quantity: 0 },
                    transaction,
                });

                if (stockFrom.quantity < quantity) {
                    throw new Error(`Stock insuficiente para el producto: ${product.name}`);
                }

                stockFrom.quantity -= quantity;
                await stockFrom.save({ transaction });

                // Manejo de stock en la bodega de destino
                const whereToCondition = {
                    productId: product.id,
                    warehouseId: warehouseToId,
                    ...(companyId && { companyId })
                };

                const [stockToInstance] = await Stock.findOrCreate({
                    where: whereToCondition,
                    defaults: { quantity: 0 },
                    transaction,
                });

                stockToInstance.quantity += quantity;
                await stockToInstance.save({ transaction });

                // Crear transacción
                await Transaction.create({
                    productId: product.id,
                    userId,
                    warehouseFromId,
                    warehouseToId,
                    quantity,
                    type: 'Salida',
                    registerId: register.id, // Se usa el valor del registro creado
                }, { transaction });
            }));

            await transaction.commit();
            return { success: true, message: 'Transacción completada correctamente.' };

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
            const result = await itemsOrder.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createRequestWarehouse(transactionData) {
        const { products, requestData } = transactionData;
        const transaction = await db.transaction();
        try {
            const newRequest = await Request.create(requestData, { transaction })
            await Promise.all(
                products.map(async (product) => {
                    return await itemsRequest.create(
                        {
                            ...product,
                            requestId: newRequest.id,
                        },
                        { transaction }
                    );
                })
            );
            await transaction.commit();
            return {
                message: 'request created successfully',
            };
        } catch (error) {
            await transaction.rollback();
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