const db = require('../../utils/database');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

const Administrative= db.define('administrative',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field:"first_name",
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        field:"last_name",
    },
    email: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        validate:{
            isEmail: true,
        }
    },
    cellPhone: {
        type: DataTypes.STRING,
        allowNull: false,
        field:"cell_phone",
    },
    company: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = Administrative;