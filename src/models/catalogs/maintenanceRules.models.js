const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRules = db.define('maintenance_rules', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    periodicity: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'periodicidad'
    },
    periodicityType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'tipo_periodicidad'
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

module.exports = MaintenanceRules;