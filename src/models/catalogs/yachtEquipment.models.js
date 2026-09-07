const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const YachtEquipment = db.define('yacht_equipment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'yacht_id',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    brand: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'marca',
    },
    model: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'modelo',
    },
    serialNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'numero_serie',
    },
    power: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'potencia',
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

module.exports = YachtEquipment;
