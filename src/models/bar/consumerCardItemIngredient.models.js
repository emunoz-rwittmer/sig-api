const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Ingredientes de un cóctel personalizado: lo que el barman armó en ese consumo.
// `quantity` va en la unidad de la receta (oz para productos en ml, unidades para el resto).
const ConsumerCardItemIngredient = db.define('consumer_card_item_ingredient', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    consumerCardItemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'consumer_card_item_id',
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
}, { tableName: 'consumer_card_item_ingredients' });

module.exports = ConsumerCardItemIngredient;
