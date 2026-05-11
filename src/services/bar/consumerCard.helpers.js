const Product = require('../../models/operations/inventory/product.models');
const Stock = require('../../models/operations/inventory/stock.models');
const Transaction = require('../../models/operations/inventory/transaction.models');

const db = require('../../utils/database');

const UNIT_CONVERTERS = {
    'ml': 29.5735,
    'unit': 1 
};

/**
 * @param {number} warehouseId 
 * @param {object} productBar
 * @param {object} item
 * @param {number} userId
 * @param {string} numberCard
 * @param {object} transaction
 */
async function deductDirectStock(warehouseId, productBar, item, userId, numberCard, transaction) {
    const stock = await Stock.findOne({
        where: { warehouseId, productId: productBar.productId },
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (!stock) {
        throw new Error(`Stock not found for product ${productBar.productId} in warehouse ${warehouseId}`);
    }

    const quantityToDeduct = item.quantity;

    if (stock.quantity < quantityToDeduct) {
        throw new Error(`Insufficient stock for product ${productBar.productId}. Available: ${stock.quantity}, Requested: ${quantityToDeduct}`);
    }

    stock.quantity -= quantityToDeduct;
    await stock.save({ transaction });

    await Transaction.create({
        productId: productBar.productId,
        warehouseFromId: warehouseId,
        userId,
        quantity: quantityToDeduct,
        type: 'BAR_CONSUMPTION',
        referenceId: `BAR_CONSUMPTION_${numberCard}`
    }, { transaction });
}

/**
 * @param {number} warehouseId
 * @param {object} productBar
 * @param {object} item
 * @param {number} userId 
 * @param {string} numberCard 
 * @param {object} transaction
 */
async function deductRecipeStock(warehouseId, productBar, item, userId, numberCard, transaction) {
    if (!productBar.recipe || !productBar.recipe.recipe_details) {
        throw new Error(`Recipe not found for product ${productBar.id}`);
    }

    for (const detail of productBar.recipe.recipe_details) {
        const ingredientStock = await Stock.findOne({
            where: { warehouseId, productId: detail.productId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!ingredientStock) {
            throw new Error(`Ingredient stock not found for product ${detail.productId} in recipe`);
        }

        const product = await Product.findByPk(detail.productId, { transaction });
        const unitType = product ? product.unit : 'unit';

        const converter = UNIT_CONVERTERS[unitType] || 1;
        const quantityPerServing = detail.quantity * converter;
        const totalQuantityToDeduct = quantityPerServing * item.quantity;

        if (ingredientStock.quantity < totalQuantityToDeduct) {
            throw new Error(
                `Insufficient ingredient stock for product ${detail.productId}. ` +
                `Available: ${ingredientStock.quantity}, ` +
                `Requested: ${totalQuantityToDeduct}`
            );
        }

        ingredientStock.quantity -= totalQuantityToDeduct;
        await ingredientStock.save({ transaction });

        await Transaction.create({
            productId: detail.productId,
            userId,
            quantity: totalQuantityToDeduct,
            warehouseFromId: warehouseId,
            type: 'BAR_CONSUMPTION',
            referenceId: `BAR_CONSUMPTION_${numberCard}`
        }, { transaction });
    }
}

module.exports = {
    UNIT_CONVERTERS,
    deductDirectStock,
    deductRecipeStock
};
