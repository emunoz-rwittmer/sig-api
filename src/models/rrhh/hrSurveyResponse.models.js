const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Respuesta anónima: sin staff_id ni fechas.
const HrSurveyResponse = db.define('hr_survey_response', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    surveyId: { type: DataTypes.INTEGER, allowNull: false, field: 'survey_id' },
    departamentId: { type: DataTypes.INTEGER, allowNull: false, field: 'departament_id' },
}, { tableName: 'hr_survey_responses', timestamps: false });

module.exports = HrSurveyResponse;
