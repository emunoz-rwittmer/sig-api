const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRuleMaterial = db.define('maintenance_rule_material', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    ruleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'rule_id',
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
    },
    recommendedQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'recommended_quantity',
    },
});

module.exports = MaintenanceRuleMaterial;
