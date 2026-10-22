const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const HrSurveyAnswer = db.define('hr_survey_answer', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    responseId: { type: DataTypes.UUID, allowNull: false, field: 'response_id' },
    questionId: { type: DataTypes.INTEGER, allowNull: false, field: 'question_id' },
    optionId: { type: DataTypes.INTEGER, allowNull: true, field: 'option_id' },
    score: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    text: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'hr_survey_answers', timestamps: false });

module.exports = HrSurveyAnswer;
