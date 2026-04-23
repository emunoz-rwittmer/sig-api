const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const ConsumerCardItems = db.define('consumer_card_items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    consumerCardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'consumer_card_id'
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'quantity'
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
});

module.exports = ConsumerCardItems;