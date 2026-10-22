const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const HrSurveyOption = db.define('hr_survey_option', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    questionId: { type: DataTypes.INTEGER, allowNull: false, field: 'question_id' },
    text: { type: DataTypes.STRING(500), allowNull: false },
    score: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
}, { tableName: 'hr_survey_options' });

module.exports = HrSurveyOption;
