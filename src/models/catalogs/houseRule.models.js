const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const HouseRule= db.define('houseRule',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    severity: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
});

module.exports = HouseRule;