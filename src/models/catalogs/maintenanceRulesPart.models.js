const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRulesPart = db.define('maintenancerules_part',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    partId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"part_id",
    },
    ruleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"rule_id",
    },
});

module.exports = MaintenanceRulesPart;