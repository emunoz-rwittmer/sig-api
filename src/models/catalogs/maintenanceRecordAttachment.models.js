const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Evidencia de un registro de mantenimiento: fotos del trabajo, factura del taller, informe en PDF.
const MaintenanceRecordAttachment = db.define('maintenance_record_attachment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    recordId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'record_id',
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'file_name',
    },
    // Ruta pública bajo /api (ej. /uploads/maintenance/foto-123.png).
    url: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    mimeType: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'mime_type',
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    uploadedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'uploaded_by',
    },
    uploadedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'uploaded_by_id',
    },
    uploadedByKind: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'uploaded_by_kind',
    },
});

module.exports = MaintenanceRecordAttachment;
