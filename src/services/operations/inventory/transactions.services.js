const Product = require('../../../models/operations/orders/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const db = require('../../../utils/database');

class TransactionService {
    static async productEntryInWarehouse(productData, stockData, transactionData) {
        const transaction = await db.transaction();

        try {
            let product = await Product.findOne({ where: { sku: productData.sku }, transaction });

            if (product) {
                await Stock.update(
                    { quantity: db.literal(`quantity + ${stockData.quantity}`) },
                    { where: { productId: product.id, warehouseId: stockData.warehouseId }, transaction }
                );

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

    static async createTransaction(transactionData) {
        const { products, warehouseFromId, warehouseToId } = transactionData;

        // Iniciar una transacción con Sequelize
        const transaction = await db.transaction();

        try {
            // Procesamos los productos utilizando la transacción
            const transactionResults = await Promise.all(
                products.map(async (product) => {
                    // Buscar y actualizar el stock de la bodega de origen
                    const stockFrom = await Stock.findOne({
                        where: { product_id: product.id, warehouse_id: warehouseFromId },
                        transaction, // Pasamos la transacción aquí
                    });

                    if (!stockFrom || stockFrom.quantity < product.quantity) {
                        throw new Error(`Stock insuficiente para el producto ${product.id}`);
                    }

                    stockFrom.quantity -= product.quantity;
                    await stockFrom.save({ transaction }); // Guardamos utilizando la transacción

                    // Buscar o crear y actualizar el stock de la bodega de destino
                    const [stockToInstance] = await Stock.findOrCreate({
                        where: { product_id: product.id, warehouse_id: warehouseToId },
                        defaults: { quantity: 0 },
                        transaction, // Pasamos la transacción aquí
                    });

                    stockToInstance.quantity += product.quantity;
                    await stockToInstance.save({ transaction }); // Guardamos utilizando la transacción

                    // Crear la transacción de registro
                    return Transaction.create({
                        product_id: product.id,
                        warehouse_from_id: warehouseFromId,
                        warehouse_to_id: warehouseToId,
                        quantity: product.quantity,
                        type: 'OUT',
                    }, { transaction }); // Crear utilizando la transacción
                })
            );

            // Confirmar la transacción si todas las operaciones fueron exitosas
            await transaction.commit();

            return transactionResults;
        } catch (error) {
            // Si ocurre algún error, revertir todos los cambios realizados en la base de datos
            await transaction.rollback();
            throw new Error(`Error al crear la transacción: ${error.message}`);
        }
    }
}

module.exports = TransactionService;