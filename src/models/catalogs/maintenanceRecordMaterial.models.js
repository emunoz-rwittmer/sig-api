const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRecordMaterial = db.define('maintenance_record_material', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    recordId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'record_id',
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

module.exports = MaintenanceRecordMaterial;
