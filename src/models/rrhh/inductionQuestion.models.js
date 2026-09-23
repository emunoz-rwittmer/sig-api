const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const InductionQuestion = db.define('induction_question', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    inductionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'induction_id',
    },
    statement: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
    },
});

module.exports = InductionQuestion;
