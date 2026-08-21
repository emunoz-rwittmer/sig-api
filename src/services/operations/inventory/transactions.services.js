const Product = require('../../../models/operations/inventory/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const db = require('../../../utils/database');
const orderItems = require('../../../models/operations/orders/orderItems.models');
const Register = require('../../../models/operations/inventory/register.models');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');

class TransactionService {

    static async productEntryInWarehouse(productData, stockData, transactionData, orderItemId) {
        const t = await db.transaction();

        try {
            // Validar producto
            if (!productData || !productData.sku) {
                throw new AppError('Datos de producto inválidos', 400);
            }

            // Validar almacén
            if (!stockData || !stockData.warehouseId) {
                throw new AppError('Almacén no especificado', 400);
            }

            const quantity = Number(stockData.quantity);

            // Validar cantidad válida y mayor a 0
            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new AppError('Cantidad debe ser un número mayor a 0', 400);
            }

            const productAttributes = {
                ...productData,
                type: 'DISCRETE'
            };

            let product = await Product.findOne({
                where: { sku: productData.sku },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!product) {
                product = await Product.create(productAttributes, { transaction: t });
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

            const normalizedQty = Quantity.normalizeQuantity(product, quantity);

            // Usar Math.round para evitar problemas de precisión al sumar decimales
            const currentQty = Number(stock?.quantity) || 0;
            const newQty = Math.round((currentQty + normalizedQty) * 100) / 100;

            if (stock) {
                stock.quantity = newQty;
                await stock.save({ transaction: t });
            } else {
                stock = await Stock.create(
                    {
                        ...stockData,
                        normalizedQty,
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
                throw new AppError('Transacción duplicada: referenceId ya existe', 400);
            }

            const newTransaction = await Transaction.create(
                {
                    ...transactionData,
                    productId: product.id,
                    normalizedQty
                },
                { transaction: t }
            );

            const orderItem = await orderItems.findOne({
                where: { id: orderItemId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!orderItem) {
                throw new AppError('Elemento de orden no encontrado', 400);
            }

            await orderItem.update(
                {
                    status: 'ingresado',
                    normalizedQty
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
                throw new AppError('Productos no válidos', 400);
            }

            if (warehouseFromId === warehouseToId) {
                throw new AppError('El almacén de origen y destino no pueden ser iguales', 400);
            }

            // Consolidar productos y validar cantidades
            const validProducts = products.filter(p => Number(p.quantity) > 0);

            const consolidatedProducts = Object.values(
                validProducts.reduce((acc, product) => {
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
            // Validar que haya productos válidos después de consolidación
            if (consolidatedProducts.length === 0) {
                throw new AppError('No hay productos válidos para procesar', 400);
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

                const infoProduct = await Product.findOne({
                    where: { id: productId },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const stockFrom = await Stock.findOne({
                    where: {
                        productId,
                        warehouseId: warehouseFromId,
                        ...(companyId && { companyId })
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const normalizedQty = Quantity.normalizeQuantity(infoProduct, quantity);

                if (!stockFrom || stockFrom.quantity < normalizedQty) {
                    throw new AppError(`Stock insuficiente para ${name}. Disponible: ${stockFrom?.quantity || 0}, Solicitado: ${normalizedQty}`, 400);
                }
            }

            // Procesar transacciones de stock y registros
            for (const product of consolidatedProducts) {
                const { id: productId, name, quantity } = product;

                const infoProduct = await Product.findOne({
                    where: { id: productId },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const stockFrom = await Stock.findOne({
                    where: {
                        productId,
                        warehouseId: warehouseFromId,
                        ...(companyId && { companyId })
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const normalizedQty = Quantity.normalizeQuantity(infoProduct, quantity);

                // Restar del almacén origen
                stockFrom.quantity -= normalizedQty;
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

                // Usar Math.round para evitar problemas de precisión al sumar decimales
                const currentQty = Number(stockTo.quantity) || 0;
                const newQty = Math.round((currentQty + normalizedQty) * 100) / 100;

                stockTo.quantity = newQty;
                await stockTo.save({ transaction });

                await Transaction.create({
                    productId,
                    userId,
                    warehouseFromId,
                    warehouseToId,
                    quantity,
                    type: 'OUT',
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
            throw error;
        }
    }

    static async incomeProductsInWarehouse(transactionData) {
        const { products, warehouseToId, companyId, userId } = transactionData;

        const transaction = await db.transaction();

        try {
            // Validar que haya productos
            if (!Array.isArray(products) || products.length === 0) {
                throw new AppError('No hay productos para procesar', 400);
            }

            // Filtrar productos con cantidad válida (> 0)
            const validProducts = products.filter(product => {
                const quantity = Number(product.quantity);
                return Number.isFinite(quantity) && quantity > 0;
            });

            if (validProducts.length === 0) {
                throw new AppError('No hay productos válidos con cantidad mayor a 0', 400);
            }

            const transactionResults = await Promise.all(
                validProducts.map(async (product) => {
                    const quantity = Number(product.quantity);

                    const infoProduct = await Product.findOne({
                        where: { id: product.id },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

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

                    const normalizedQty = Quantity.normalizeQuantity(infoProduct, quantity);

                    // Usar Math.round para evitar problemas de precisión al sumar decimales
                    const currentQty = Number(stockToInstance.quantity) || 0;
                    const newQty = Math.round((currentQty + normalizedQty) * 100) / 100;

                    stockToInstance.quantity = newQty;
                    await stockToInstance.save({ transaction });

                    return Transaction.create({
                        productId: product.id,
                        userId,
                        warehouseToId,
                        quantity,  // Usar cantidad normalizada en la transacción
                        type: 'IN'
                    }, { transaction });
                })
            );

            await transaction.commit();
            return transactionResults;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateStatusItem(data, itemId) {
        const existing = await orderItems.findByPk(itemId);
        if (!existing) {
            throw new AppError('Elemento no encontrado', 404);
        }
        return orderItems.update(data, { where: { id: itemId } });
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

        const transaction = await db.transaction();
        const { transactiones, warehouseToId, companyId, userId, registerId, observations } = transactionData;

        try {
            // Validar que haya productos
            if (!Array.isArray(transactiones) || transactiones.length === 0) {
                throw new AppError('No hay productos para procesar', 400);
            }

            // Filtrar productos con cantidad válida (> 0)
            const validProducts = transactiones.filter(product => {
                const quantity = Number(product.quantity);
                return Number.isFinite(quantity) && quantity > 0;
            });

            if (validProducts.length === 0) {
                throw new AppError('No hay productos válidos con cantidad mayor a 0', 400);
            }

            const transactionResults = await Promise.all(validProducts.map(async (transac) => {
                const quantity = Number(transac.quantity);
                let originalTransaction = null;
                let quantityDifference = 0;

                if (transac.id) {
                    originalTransaction = await Transaction.findOne({
                        where: { id: transac.id },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    if (!originalTransaction) {
                        throw new AppError(`Transacción original no encontrada para el producto ${transac.product.name}`, 400);
                    }

                    quantityDifference = quantity - originalTransaction.quantity;
                }

                const sourceWarehouseId = 9;
                const productId = transac.product.id;

                if (quantityDifference !== 0 && !observations) {
                    throw new AppError(`La cantidad del producto ${transac.product.name} ha cambiado, debe ingresar observaciones`, 400);
                }

                if (originalTransaction && observations && observations.trim() !== '' && quantityDifference !== 0) {

                    originalTransaction.quantity = quantity;
                    await originalTransaction.save({ transaction });

                    const stockFromSource = await Stock.findOne({
                        where: {
                            productId,
                            warehouseId: originalTransaction.warehouseFromId,
                            companyId
                        },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    if (!stockFromSource) {
                        throw new AppError(`Stock no encontrado para el producto ${transac.product.name} en bodega origen`, 400);
                    }

                    stockFromSource.quantity -= quantityDifference;
                    if (stockFromSource.quantity < 0) {
                        throw new AppError(`Stock insuficiente en bodega origen para el producto ${transac.product.name}: No se puede restar diferencia de ${quantityDifference}`, 400);
                    }

                    await stockFromSource.save({ transaction });

                    const [stockWarehouse9] = await Stock.findOrCreate({
                        where: {
                            productId,
                            warehouseId: sourceWarehouseId,
                            companyId
                        },
                        defaults: { quantity: 0 },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    const currentQty = Number(stockWarehouse9.quantity) || 0;
                    const newQty = Math.round((currentQty + quantityDifference) * 100) / 100;

                    stockWarehouse9.quantity = newQty;
                    await stockWarehouse9.save({ transaction });
                }

                const stockFrom = await Stock.findOne({
                    where: {
                        productId,
                        warehouseId: sourceWarehouseId,
                        companyId
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!stockFrom) {
                    throw new AppError(`Stock no encontrado para el producto ${transac.product.name} en almacén origen`, 400);
                }
                if (stockFrom.quantity < quantity) {
                    throw new AppError(`Stock insuficiente para el producto ${transac.product.name}: Disponible: ${stockFrom.quantity}, Solicitado: ${quantity}`, 400);
                }

                stockFrom.quantity -= quantity;
                await stockFrom.save({ transaction });

                const whereToCondition = {
                    productId,
                    warehouseId: warehouseToId,
                };

                const [stockToInstance] = await Stock.findOrCreate({
                    where: whereToCondition,
                    defaults: { quantity: 0 },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const currentQty = Number(stockToInstance.quantity) || 0;
                const newQty = Math.round((currentQty + quantity) * 100) / 100;

                stockToInstance.quantity = newQty;
                await stockToInstance.save({ transaction });

                return await Transaction.create({
                    productId,
                    userId,
                    warehouseFromId: sourceWarehouseId,
                    warehouseToId,
                    quantity,
                    type: 'OUT'
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
            throw error;
        }
    }
}

module.exports = TransactionService;