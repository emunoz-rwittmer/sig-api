const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const StaffDocumentation = db.define('staff_documentation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "staff_id",
    },
    documentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "document_id",
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    file: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    fileName: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    fileSize: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "expiry_date",
    },
});

module.exports = StaffDocumentation;