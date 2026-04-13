const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Maintenance = db.define('maintenance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    rulesPartId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'rules_part_id',
    },
    responsible: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'responsable'
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
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
    doneDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'fecha_realizacion'
    },
    approve: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'aprobado'
    },

});

module.exports = Maintenance;