const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const YachtParts = db.define('yacht_parts', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'yacht_id'
    },
    hours: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'horas'
    },
    lastRepair: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'ultima_reparacion'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    brand: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'marca'
    },
    model: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'modelo'
    },
    serie: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'numero_serie'
    },
    power: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'potencia'
    },
    rpm: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

module.exports = YachtParts;