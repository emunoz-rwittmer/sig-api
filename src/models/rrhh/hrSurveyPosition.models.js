const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Cargos a los que va dirigida la encuesta.
const HrSurveyPosition = db.define('hr_survey_position', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    surveyId: { type: DataTypes.INTEGER, allowNull: false, field: 'survey_id' },
    positionId: { type: DataTypes.INTEGER, allowNull: false, field: 'position_id' },
}, {
    tableName: 'hr_survey_positions',
    indexes: [{ unique: true, fields: ['survey_id', 'position_id'] }],
});

module.exports = HrSurveyPosition;
