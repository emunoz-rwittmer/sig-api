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
    // Segundo intervalo, por calendario, para reglas por horas: "250 h o 6 meses, lo que ocurra primero".
    secondaryValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'secondary_value',
    },
    secondaryUnit: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'secondary_unit',
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
