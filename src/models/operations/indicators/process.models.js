const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Process = db.define('process', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    departamentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'departament_id'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = Process;