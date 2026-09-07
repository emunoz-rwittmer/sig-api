const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRule = db.define('maintenance_rule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    periodicityValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'periodicity_value',
    },
    periodicityUnit: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'periodicity_unit',
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

module.exports = MaintenanceRule;
