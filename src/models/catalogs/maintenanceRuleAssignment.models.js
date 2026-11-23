const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRuleAssignment = db.define('maintenance_rule_assignment', {
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
    ruleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'rule_id',
    },
    // Línea base: último servicio conocido antes de llevar el equipo en el sistema.
    baselineDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'baseline_date',
    },
    baselineHours: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'baseline_hours',
    },
    // Intervalo propio de este equipo (misma unidad que la regla); null = el de la regla.
    intervalOverride: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'interval_override',
    },
    // Posposición del vencimiento actual: corre hasta el siguiente registro de esta regla.
    postponedUntilDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'postponed_until_date',
    },
    postponedUntilHours: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'postponed_until_hours',
    },
    postponeReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'postpone_reason',
    },
    postponedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'postponed_by',
    },
    postponedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'postponed_by_id',
    },
    postponedByKind: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'postponed_by_kind',
    },
    postponedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'postponed_at',
    },
    // Último registro de la regla al posponer: la posposición vale mientras siga siendo el último.
    postponedAfterRecordId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'postponed_after_record_id',
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    indexes: [
        { unique: true, fields: ['equipment_id', 'rule_id'] },
    ],
});

module.exports = MaintenanceRuleAssignment;
