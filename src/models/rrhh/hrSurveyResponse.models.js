const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Respuesta anónima: sin staff_id ni fechas.
const HrSurveyResponse = db.define('hr_survey_response', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    surveyId: { type: DataTypes.INTEGER, allowNull: false, field: 'survey_id' },
    departamentId: { type: DataTypes.INTEGER, allowNull: false, field: 'departament_id' },
    // Atributos del puesto al responder, para tabular por cargo / tipo. Nulos en respuestas anteriores.
    positionId: { type: DataTypes.INTEGER, allowNull: true, field: 'position_id' },
    staffType: { type: DataTypes.STRING(20), allowNull: true, field: 'staff_type' },
}, { tableName: 'hr_survey_responses', timestamps: false });

module.exports = HrSurveyResponse;
