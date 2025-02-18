const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Probability = db.define('Probability', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    level: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    concept: {
        type: DataTypes.STRING,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false
    },
    frequency: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'probabilities',
    timestamps: true
});

module.exports = Probability;
