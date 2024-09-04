const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Warehouse= db.define('warehouse',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    currentStock: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'current_stock'
    },
});

module.exports = Warehouse;