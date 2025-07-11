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
    },
    flightOne: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'vuelo_uno'
    },
    dateFlightOne: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'fecha_vuelo_uno'
    },
    flightTwo: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'vuelo_dos'
    },
    dateFlightTwo: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'fecha_vuelo_dos'
    },
    file: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

});

module.exports = RequestStaffs;