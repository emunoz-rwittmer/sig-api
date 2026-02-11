const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const DoctorFormat = db.define('doctor_format', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    file: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
     companies: {
        type: DataTypes.JSON,
        allowNull: true,
    }
});

module.exports = DoctorFormat;