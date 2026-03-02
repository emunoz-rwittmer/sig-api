const Product = require('../../../models/operations/orders/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const db = require('../../../utils/database');
const orderItems = require('../../../models/operations/orders/orderItems.models');
const Register = require('../../../models/operations/inventory/register.models');

class TransactionService {

    static async productEntryInWarehouse(productData, stockData, transactionData, orderItemId) {
        const t = await db.transaction();

        try {
            const quantity = Number(stockData.quantity);

            // Validar cantidad válida y mayor a 0
            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new Error('Cantidad debe ser un número mayor a 0');
            }

            // Validar producto
            if (!productData || !productData.sku) {
                throw new Error('Datos de producto inválidos');
            }

            // Validar almacén
            if (!stockData || !stockData.warehouseId) {
                throw new Error('Almacén no especificado');
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
                stock.quantity += quantity;
                await stock.save({ transaction: t });
            } else {
                stock = await Stock.create(
                    {
                        ...stockData,
                        quantity,
                        productId: product.id
                    },
                    { transaction: t }
                );
            }

            // Validar transacción duplicada
            const existsTransaction = await Transaction.findOne({
                where: { referenceId: transactionData.referenceId },
                transaction: t
            });

            if (existsTransaction) {
                throw new Error('Transacción duplicada: referenceId ya existe');
            }

            const newTransaction = await Transaction.create(
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
                throw new Error('Elemento de orden no encontrado');
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
                success: true,
                message: stock ? 'Stock actualizado y transacción registrada' : 'Producto, stock y transacción creados',
                orderItemId,
                productId: product.id,
                transactionId: newTransaction.id
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
            // Validaciones previas
            if (!Array.isArray(products) || products.length === 0) {
                throw new Error('Productos no válidos');
            }

            if (warehouseFromId === warehouseToId) {
                throw new Error('El almacén de origen y destino no pueden ser iguales');
            }

            // Consolidar productos y validar cantidades
            const consolidatedProducts = Object.values(
                products.reduce((acc, product) => {
                    const quantity = Number(product.quantity);

                    // Validar cantidad válida y mayor a 0
                    if (!Number.isFinite(quantity) || quantity <= 0) {
                        return acc; // Ignorar productos con cantidad inválida
                    }

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

            // Validar que haya productos válidos después de consolidación
            if (consolidatedProducts.length === 0) {
                throw new Error('No hay productos válidos para procesar');
            }

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

            // Validar disponibilidad de stock antes de crear transacciones
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
                    throw new Error(`Stock insuficiente para ${name}. Disponible: ${stockFrom?.quantity || 0}, Solicitado: ${quantity}`);
                }
            }

            // Procesar transacciones de stock y registros
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

                // Restar del almacén origen
                stockFrom.quantity -= quantity;
                await stockFrom.save({ transaction });

                // Sumar al almacén destino
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
            // Validar que haya productos
            if (!Array.isArray(products) || products.length === 0) {
                throw new Error('No hay productos para procesar');
            }

            // Filtrar productos con cantidad válida (> 0)
            const validProducts = products.filter(product => {
                const quantity = Number(product.quantity);
                return Number.isFinite(quantity) && quantity > 0;
            });

            if (validProducts.length === 0) {
                throw new Error('No hay productos válidos con cantidad mayor a 0');
            }

            const transactionResults = await Promise.all(
                validProducts.map(async (product) => {
                    const quantity = Number(product.quantity);

                    const whereCondition = {
                        productId: product.id,
                        warehouseId: warehouseToId,
                        ...(companyId && { companyId: companyId })
                    };

                    const [stockToInstance] = await Stock.findOrCreate({
                        where: whereCondition,
                        defaults: { quantity: 0 },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    stockToInstance.quantity += quantity;
                    await stockToInstance.save({ transaction });

                    return Transaction.create({
                        productId: product.id,
                        userId,
                        warehouseToId,
                        quantity,
                        type: 'Entrada'
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
            if (!id) {
                throw new Error('ID del elemento no especificado');
            }
            const result = await orderItems.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Valida y convierte cantidad a número
     * @param {*} quantity - Cantidad a validar
     * @returns {boolean} - true si la cantidad es válida y > 0
     */
    static validateQuantity(quantity) {
        const num = Number(quantity);
        return Number.isFinite(num) && num > 0;
    }

    static async incomeProductsRegister(transactionData) {
        const { products, warehouseToId, companyId, userId, registerId, observations } = transactionData;

        const transaction = await db.transaction();

        try {
            // Validar que haya productos
            if (!Array.isArray(products) || products.length === 0) {
                throw new Error('No hay productos para procesar');
            }

            // Filtrar productos con cantidad válida (> 0)
            const validProducts = products.filter(product => {
                const quantity = Number(product.quantity);
                return Number.isFinite(quantity) && quantity > 0;
            });

            if (validProducts.length === 0) {
                throw new Error('No hay productos válidos con cantidad mayor a 0');
            }

            const transactionResults = await Promise.all(validProducts.map(async (product) => {
                const quantity = Number(product.quantity);

                const stockFrom = await Stock.findOne({
                    where: {
                        productId: product.id,
                        warehouseId: 9,
                        companyId
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!stockFrom) {
                    throw new Error(`Stock no encontrado para el producto ${product.name} en almacén origen`);
                }

                if (stockFrom.quantity < quantity) {
                    throw new Error(`Stock insuficiente para el producto ${product.name}: Disponible: ${stockFrom.quantity}, Solicitado: ${quantity}`);
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
                    lock: transaction.LOCK.UPDATE
                });

                stockToInstance.quantity += quantity;
                await stockToInstance.save({ transaction });

                return await Transaction.create({
                    productId: product.id,
                    userId,
                    warehouseFromId: 9,
                    warehouseToId,
                    quantity,
                    type: 'Salida'
                }, { transaction });
            }));

            // Actualizar registro una sola vez al final
            await Register.update(
                {
                    isResived: true,
                    observations
                },
                {
                    where: { id: registerId },
                    transaction
                }
            );

            await transaction.commit();
            return transactionResults;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
}

module.exports = TransactionService;