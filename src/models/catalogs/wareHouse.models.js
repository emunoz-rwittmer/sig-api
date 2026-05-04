const db = require('../../utils/database');
const { DataTypes } = require('sequelize');
const Yacht = require('./yacht.models');

const Warehouse = db.define('warehouse', {
    id: {
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
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'yacht_id'
    },
});

module.exports = Warehouse;