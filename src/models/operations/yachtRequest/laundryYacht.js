const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const LaundryYacht = db.define('laundryYacht', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "product_id",
    },
    warehouseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "warehouse_id",
    },
});

module.exports = LaundryYacht;