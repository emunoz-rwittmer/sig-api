const Product = require('../../../models/operations/inventory/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const db = require('../../../utils/database');
const orderItems = require('../../../models/operations/orders/orderItems.models');
const Register = require('../../../models/operations/inventory/register.models');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');
const OrderService = require('../orders/orders.services');
const { TRANSIT_WAREHOUSE_ID } = require('../../../utils/warehouses');

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
                message: 'Stock actualizado y transacción registrada',
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
        const { products, warehouseFromId, warehouseToId, userId, companyId, formattedCounter, orderId } = transactionData;

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
                orderId,
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

            if (orderId) {
                await OrderService.markDistributedIfComplete(orderId, transaction);
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

    // Suma (o resta, con delta negativo) al stock; lo crea en 0 si no existe.
    static async adjustStock(where, delta, transaction) {
        const [stock] = await Stock.findOrCreate({
            where,
            defaults: { quantity: 0 },
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        // Math.round para evitar problemas de precisión al sumar decimales
        stock.quantity = Math.round(((Number(stock.quantity) || 0) + delta) * 100) / 100;
        await stock.save({ transaction });
        return stock;
    }

    // Recepción libre en GPS: entra lo que realmente llegó. Las diferencias contra
    // lo despachado no tocan la bodega origen; quedan en tránsito (positivo si faltó,
    // negativo si sobró) como novedad pendiente hasta resolveRegisterNovelty.
    static async incomeProductsRegister({ lines, warehouseToId, userId, registerId, observations }) {
        const transaction = await db.transaction();

        try {
            if (!Array.isArray(lines) || lines.length === 0) {
                throw new AppError('No hay productos para procesar', 400);
            }

            const register = await Register.findByPk(registerId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!register) {
                throw new AppError('Registro no encontrado', 404);
            }
            if (register.isResived) {
                throw new AppError('Este registro ya fue ingresado', 400);
            }

            const dispatched = await Transaction.findAll({
                where: { registerId: String(register.id), warehouseToId: TRANSIT_WAREHOUSE_ID, type: 'OUT' },
                transaction
            });
            if (dispatched.length === 0) {
                throw new AppError('El registro no corresponde a un despacho en tránsito', 400);
            }

            const sentByProduct = new Map();
            for (const line of dispatched) {
                sentByProduct.set(line.productId, (sentByProduct.get(line.productId) || 0) + Number(line.quantity));
            }

            const receivedByProduct = new Map();
            for (const line of lines) {
                const quantity = Number(line.quantity);
                if (!Number.isInteger(line.productId) || !Number.isFinite(quantity) || quantity < 0) {
                    throw new AppError('Producto o cantidad inválidos', 400);
                }
                receivedByProduct.set(line.productId, (receivedByProduct.get(line.productId) || 0) + quantity);
            }

            let hasNovelty = false;
            const results = [];

            // Un producto despachado que no viene en el payload cuenta como no recibido (0).
            for (const productId of new Set([...sentByProduct.keys(), ...receivedByProduct.keys()])) {
                const sent = sentByProduct.get(productId) || 0;
                const received = receivedByProduct.get(productId) || 0;
                if (sent !== received) hasNovelty = true;
                if (received <= 0) continue;

                const product = await Product.findByPk(productId, { transaction });
                if (!product) {
                    throw new AppError('Producto no encontrado', 400);
                }
                const normalizedQty = Quantity.normalizeQuantity(product, received);

                await TransactionService.adjustStock(
                    { productId, warehouseId: TRANSIT_WAREHOUSE_ID, companyId: register.companyId },
                    -normalizedQty,
                    transaction
                );
                // Sin companyId a propósito: la central de GPS junta el stock de todas las empresas.
                await TransactionService.adjustStock({ productId, warehouseId: warehouseToId }, normalizedQty, transaction);

                results.push(await Transaction.create({
                    productId,
                    userId,
                    warehouseFromId: TRANSIT_WAREHOUSE_ID,
                    warehouseToId,
                    quantity: received,
                    type: 'OUT',
                    registerId: register.id
                }, { transaction }));
            }

            if (hasNovelty && !observations?.trim()) {
                throw new AppError('Hay diferencias con lo despachado, debe ingresar observaciones', 400);
            }

            await register.update({
                isResived: true,
                observations,
                receivedBy: userId,
                receivedAt: new Date(),
                noveltyStatus: hasNovelty ? 'pendiente' : null
            }, { transaction });

            await transaction.commit();
            return { hasNovelty, register, transactions: results };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // El encargado de la bodega origen regulariza la novedad: lo que faltó en GPS
    // vuelve de tránsito al origen y lo que llegó de más se descuenta del origen.
    // Tránsito queda cuadrado para ese registro.
    static async resolveRegisterNovelty({ registerId, userId }) {
        const transaction = await db.transaction();

        try {
            const register = await Register.findByPk(registerId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!register) {
                throw new AppError('Registro no encontrado', 404);
            }
            if (register.noveltyStatus !== 'pendiente') {
                throw new AppError('El registro no tiene novedades pendientes', 400);
            }

            const lines = await Transaction.findAll({
                where: { registerId: String(register.id), type: 'OUT' },
                transaction
            });
            const originId = lines.find(line => line.warehouseToId === TRANSIT_WAREHOUSE_ID)?.warehouseFromId;
            if (!originId) {
                throw new AppError('El registro no corresponde a un despacho en tránsito', 400);
            }

            // diferencia = despachado - recibido
            const diffByProduct = new Map();
            for (const line of lines) {
                const sign = line.warehouseToId === TRANSIT_WAREHOUSE_ID ? 1 : -1;
                diffByProduct.set(line.productId, (diffByProduct.get(line.productId) || 0) + sign * Number(line.quantity));
            }

            for (const [productId, diff] of diffByProduct) {
                if (diff === 0) continue;

                const product = await Product.findByPk(productId, { transaction });
                const normalizedQty = Quantity.normalizeQuantity(product, Math.abs(diff));
                const toOrigin = diff > 0 ? normalizedQty : -normalizedQty;

                const originStock = await TransactionService.adjustStock(
                    { productId, warehouseId: originId, companyId: register.companyId },
                    toOrigin,
                    transaction
                );
                if (originStock.quantity < 0) {
                    throw new AppError(`Stock insuficiente en bodega origen para ${product.name}: llegaron ${Math.abs(diff)} de más a GPS. Ingrese primero ese stock a la bodega origen`, 400);
                }
                await TransactionService.adjustStock(
                    { productId, warehouseId: TRANSIT_WAREHOUSE_ID, companyId: register.companyId },
                    -toOrigin,
                    transaction
                );

                await Transaction.create({
                    productId,
                    userId,
                    warehouseFromId: diff > 0 ? TRANSIT_WAREHOUSE_ID : originId,
                    warehouseToId: diff > 0 ? originId : TRANSIT_WAREHOUSE_ID,
                    quantity: Math.abs(diff),
                    type: 'ADJUST',
                    registerId: register.id
                }, { transaction });
            }

            await register.update({
                noveltyStatus: 'resuelta',
                resolvedBy: userId,
                resolvedAt: new Date()
            }, { transaction });

            await transaction.commit();
            return register;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = TransactionService;