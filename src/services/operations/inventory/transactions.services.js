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

                const [stock, created] = await Stock.findOrCreate({
                    where: { productId: product.id, warehouseId: stockData.warehouseId },
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

    static async createTransaction(transactionData) {
        const { products, warehouseFromId, warehouseToId, userId } = transactionData;

        const transaction = await db.transaction();

        try {
            const transactionResults = await Promise.all(
                products.map(async (product) => {
                    const stockFrom = await Stock.findOne({
                        where: { productId: product.id, warehouseId: warehouseFromId },
                        transaction,
                    });

                    if (!stockFrom || stockFrom.quantity < product.quantity) {
                        throw new Error(`Stock insuficiente para el producto: ${product.name}`);
                    }

                    stockFrom.quantity -= product.quantity;
                    await stockFrom.save({ transaction });

                    const [stockToInstance] = await Stock.findOrCreate({
                        where: { productId: product.id, warehouseId: warehouseToId },
                        defaults: { quantity: 0 },
                        transaction,
                    });

                    stockToInstance.quantity += product.quantity;
                    await stockToInstance.save({ transaction });

                    return Transaction.create({
                        productId: product.id,
                        userId: userId,
                        warehouseFromId: warehouseFromId,
                        warehouseToId: warehouseToId,
                        quantity: product.quantity,
                        type: 'Salida',
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
}

module.exports = TransactionService;