const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Falla reportada en un equipo: queda abierta hasta que un registro de mantenimiento la atiende.
const MaintenanceFault = db.define('maintenance_fault', {
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
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'yacht_id',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    // baja | media | alta | critica
    severity: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // abierta | cerrada
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'abierta',
    },
    reportedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'reported_at',
    },
    reportedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'reported_by',
    },
    reportedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reported_by_id',
    },
    reportedByKind: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'reported_by_kind',
    },
    cause: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    recordId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'record_id',
    },
    closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'closed_at',
    },
});

module.exports = MaintenanceFault;
