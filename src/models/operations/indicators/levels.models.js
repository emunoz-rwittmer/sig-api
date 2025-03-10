const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Levels = db.define('Levels', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    level: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    concept: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'levels',
    timestamps: true
});

module.exports = Levels;
