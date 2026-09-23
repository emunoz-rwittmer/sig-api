const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const InductionAttempt = db.define('induction_attempt', {
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
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'staff_id',
    },
    correctCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'correct_count',
    },
    totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'total_questions',
    },
    score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
    passed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    answers: {
        type: DataTypes.JSON,
        allowNull: true,
    },
});

module.exports = InductionAttempt;
