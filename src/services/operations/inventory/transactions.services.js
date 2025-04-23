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
    static async productEntryInWarehouse(productData, stockData, transactionData) {
        const transaction = await db.transaction();

        try {
            let product = await Product.findOne({ where: { sku: productData.sku }, transaction });
            if (product) {
                const whereCondition = {
                    productId: product.id,
                    warehouseId: stockData.warehouseId,
                    ...(stockData.companyId && { companyId: stockData.companyId })  // Agrega companyId solo si existe
                };

                const [stock, created] = await Stock.findOrCreate({
                    where: whereCondition,
                    defaults: { ...stockData, productId: product.id },
                    transaction
                });

                if (!created) {
                    await stock.update(
                        { quantity: db.literal(`quantity + ${stockData.quantity}`) },
                        { transaction }
                    );
                }

                await Transaction.create(
                    {
                        ...transactionData,
                        productId: product.id,
                    },
                    { transaction }
                );

                await transaction.commit();

                return {
                    message: 'stock update and transaction register',

                };
            } else {
                const newProduct = await Product.create(productData, { transaction });

                await Stock.create(
                    {
                        ...stockData,
                        productId: newProduct.id,
                    },
                    { transaction }
                );

                await Transaction.create(
                    {
                        ...transactionData,
                        productId: newProduct.id,
                    },
                    { transaction }
                );

                await transaction.commit();
                return {
                    message: 'product, stock and transaction created',
                };
            }
        } catch (error) {
            await transaction.rollback();
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
            console.log(error)
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