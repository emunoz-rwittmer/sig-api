const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Strategy = db.define('Strategy', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    concept: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'Strategy',
    timestamps: true
});

module.exports = Strategy;
