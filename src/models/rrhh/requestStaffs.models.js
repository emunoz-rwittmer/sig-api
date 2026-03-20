const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const RequestStaffs = db.define('request_staffs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    formatId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'format_id'
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'staff_id'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    company: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'compania'
    },
    yacht: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'yate'
    },
    file: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

});

module.exports = RequestStaffs;