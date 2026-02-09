const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const StaffDocumentation= db.define('staff_documentation',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"staff_id",
    },
    documentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"document_id",
    },
});

module.exports = StaffDocumentation;