const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const InductionMaterial = db.define('induction_material', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    inductionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'induction_id',
    },
    kind: {
        type: DataTypes.ENUM('file', 'link'),
        allowNull: false,
        defaultValue: 'file',
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    mimeType: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'mime_type',
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
    },
});

module.exports = InductionMaterial;
