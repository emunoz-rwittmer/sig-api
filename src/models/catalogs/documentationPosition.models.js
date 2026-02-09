const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const DocumentationPosition= db.define('documentation_position',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    documentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"document_id",
    },
    positionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"position_id",
    },
});

module.exports = DocumentationPosition;