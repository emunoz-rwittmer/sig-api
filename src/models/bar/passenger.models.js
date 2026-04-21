const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Passenger = db.define('passenger', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    cruiseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cruise_id'
    },
    identificationNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    age: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    agency: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    cabin: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    nationality: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cruiseStartDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    cruiseEndDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },

});

module.exports = Passenger;