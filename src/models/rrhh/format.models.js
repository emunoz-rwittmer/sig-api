const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Format = db.define('format', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
    }
});

module.exports = Format;