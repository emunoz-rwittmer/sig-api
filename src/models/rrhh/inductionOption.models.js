const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const InductionOption = db.define('induction_option', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'question_id',
    },
    text: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_correct',
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
    },
});

module.exports = InductionOption;
