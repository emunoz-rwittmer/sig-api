const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Mantenimiento por realizar que genera el sistema cuando una regla pasa a próxima o vencida.
// Queda pendiente hasta que se registra el trabajo (completada) o la regla vuelve a estar al día por otro motivo (cerrada).
const MaintenanceTask = db.define('maintenance_task', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    assignmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'assignment_id',
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
        allowNull: false,
        field: 'rule_id',
    },
    // pendiente | completada | cerrada
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pendiente',
    },
    // Estado de la regla cuando se generó: proxima | vencida
    dueStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'due_status',
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

module.exports = MaintenanceTask;
