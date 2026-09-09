const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRecord = db.define('maintenance_record', {
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
    ruleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'rule_id',
    },
    responsible: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'responsable',
    },
    workPerformed: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'work_performed',
    },
    maintenanceType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'maintenance_type',
    },
    performedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'performed_at',
    },
    hoursReading: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'hours_reading',
    },
    observation: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    approvedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'approved_by',
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at',
    },
});

module.exports = MaintenanceRecord;
