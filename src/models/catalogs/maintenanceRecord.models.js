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
    // Quién lo cargó en el sistema (usuario logueado); `responsible` es quien hizo el trabajo.
    createdBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'created_by',
    },
    createdById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by_id',
    },
    createdByKind: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'created_by_kind',
    },
    approvedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'approved_by',
    },
    approvedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'approved_by_id',
    },
    approvedByKind: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'approved_by_kind',
    },
    // Quién ejecutó: tripulacion | taller (externo), con proveedor y costo si aplica.
    performedByType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'performed_by_type',
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    // Bodega de la que salieron los materiales al aprobar (para devolverlos si se anula).
    stockWarehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'stock_warehouse_id',
    },
    // Anulación: el registro no se borra, queda marcado con motivo y firma y deja de contar.
    voidedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'voided_at',
    },
    voidReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'void_reason',
    },
    voidedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'voided_by',
    },
    voidedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'voided_by_id',
    },
    voidedByKind: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'voided_by_kind',
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at',
    },
});

module.exports = MaintenanceRecord;
