const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Lectura de horómetro tomada fuera de un mantenimiento (ronda semanal, fin de viaje…).
const EquipmentHourReading = db.define('equipment_hour_reading', {
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
    reading: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'read_at',
    },
    registeredById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'registered_by_id',
    },
    registeredByKind: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'registered_by_kind',
    },
});

module.exports = EquipmentHourReading;
