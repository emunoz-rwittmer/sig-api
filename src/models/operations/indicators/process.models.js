const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Process = db.define('process', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = Process;