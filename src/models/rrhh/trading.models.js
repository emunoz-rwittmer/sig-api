const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Trading = db.define('trading', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
});

module.exports = Trading;