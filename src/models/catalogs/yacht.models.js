const db = require('../../utils/database');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

const Yacht= db.define('yacht',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    warehouseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'warehouse_id'
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
});

module.exports = Yacht;