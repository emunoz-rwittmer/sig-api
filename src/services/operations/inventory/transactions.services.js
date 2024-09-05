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

}

module.exports = TransactionService;