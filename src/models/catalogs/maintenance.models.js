const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Maintenance = db.define('maintenance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    previousMaintenanceHours: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'horas_mantenimiento_anterior'
    },
    nextMaintenanceHours: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'horas_mantenimiento_siguiente'
    },
    hoursAtMaintenance: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'horas_mantenimiento'
    },
    observation: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    materials: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

module.exports = Maintenance;