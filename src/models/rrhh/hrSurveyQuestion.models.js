const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// type: 'opcion multiple' | 'lista' | 'scale' | 'texto' | 'texto largo'
const HrSurveyQuestion = db.define('hr_survey_question', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    surveyId: { type: DataTypes.INTEGER, allowNull: false, field: 'survey_id' },
    statement: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.STRING(30), allowNull: false },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    scaleMin: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true, field: 'scale_min' },
    scaleMax: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true, field: 'scale_max' },
    // Agrupa preguntas en la reportería (ej. Liderazgo, Compañerismo). Opcional.
    category: { type: DataTypes.STRING(80), allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
}, { tableName: 'hr_survey_questions' });

module.exports = HrSurveyQuestion;
