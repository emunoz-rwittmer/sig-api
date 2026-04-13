const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceMaterials = db.define('maintenance_materials', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
   maintenanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'maintenance_id'
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

module.exports = MaintenanceMaterials;