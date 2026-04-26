const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const CortecyCard = db.define('cortecy_card', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    cruiseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cruise_id'
    },
    numberCard: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    totalCount: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        allowNull: false,
    },
    observation: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

module.exports = CortecyCard;