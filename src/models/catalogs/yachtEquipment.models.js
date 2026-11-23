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
    // Sistema al que pertenece (propulsion, generacion, electrico, seguridad, navegacion, casco, hidraulico, otros).
    category: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Crítico según ISM: su falla repentina pone en riesgo el barco o la gente; sus vencimientos van primero.
    critical: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

module.exports = YachtEquipment;
