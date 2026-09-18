const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Question= db.define('question',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    category: {
        type: DataTypes.STRING(60),
        allowNull: true,
    },
    positionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'position_id',
    },
});

module.exports = Question;