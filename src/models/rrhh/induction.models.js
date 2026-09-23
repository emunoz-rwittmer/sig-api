const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Induction = db.define('induction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    passingScore: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 70,
        field: 'passing_score',
    },
    maxAttempts: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 3,
        field: 'max_attempts',
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
});

module.exports = Induction;
