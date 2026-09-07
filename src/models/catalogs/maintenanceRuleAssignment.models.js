const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRuleAssignment = db.define('maintenance_rule_assignment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    equipmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'equipment_id',
    },
    ruleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'rule_id',
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    indexes: [
        { unique: true, fields: ['equipment_id', 'rule_id'] },
    ],
});

module.exports = MaintenanceRuleAssignment;
