const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Documentation = db.define('documentation', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    positions: {
        type: DataTypes.JSON,
        allowNull: true,
    }

});

module.exports = Documentation;