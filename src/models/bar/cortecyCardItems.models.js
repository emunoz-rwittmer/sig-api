const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const CortecyCardItems = db.define('cortecy_card_items', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    cortecyCardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cortecy_card_id'
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

module.exports = CortecyCardItems;