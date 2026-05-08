const Product = require('../../models/operations/inventory/product.models');
const Stock = require('../../models/operations/inventory/stock.models');
const Transaction = require('../../models/operations/inventory/transaction.models');

const db = require('../../utils/database');

// Constantes para conversión de unidades
// Las recetas siempre usan ONZAS, aquí definimos cómo convertir según el tipo de unidad del stock
const UNIT_CONVERTERS = {
    'ML': 29.5735,    // Stock en ML: convertir onzas de receta a mililitros (1 oz = 29.5735 ml)
    'UNIT': 1         // Stock en UNIDADES: sin conversión (1 a 1)
};

/**
 * Descuenta stock directo de bebida individual
 * @param {number} warehouseId - ID del almacén
 * @param {object} productBar - Objeto del producto de bar
 * @param {object} item - Item a descontar (con id, quantity, price)
 * @param {number} userId - ID del usuario que realiza el consumo
 * @param {string} numberCard - Número de tarjeta de consumo
 * @param {object} transaction - Transacción de BD
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

    // Registrar la transacción
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
 * Descuenta stock de receta (considera ingredientes individuales)
 * @param {number} warehouseId - ID del almacén
 * @param {object} productBar - Objeto del producto de bar con receta
 * @param {object} item - Item a descontar
 * @param {number} userId - ID del usuario
 * @param {string} numberCard - Número de tarjeta
 * @param {object} transaction - Transacción de BD
 */
async function deductRecipeStock(warehouseId, productBar, item, userId, numberCard, transaction) {
    if (!productBar.recipe || !productBar.recipe.recipe_details) {
        throw new Error(`Recipe not found for product ${productBar.id}`);
    }

    // Procesar cada ingrediente de la receta
    for (const detail of productBar.recipe.recipe_details) {
        const ingredientStock = await Stock.findOne({
            where: { warehouseId, productId: detail.productId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!ingredientStock) {
            throw new Error(`Ingredient stock not found for product ${detail.productId} in recipe`);
        }

        // Obtener unitType del producto general para saber cómo convertir
        // unitType puede ser 'ML' o 'UNIT' según cómo se almacena el stock
        const product = await Product.findByPk(detail.productId, { transaction });
        const unitType = product ? product.unit : 'UNIT';
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

        // Registrar transacción del ingrediente
        await Transaction.create({
            productId: detail.productId,
            userId,
            quantity: totalQuantityToDeduct,
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
