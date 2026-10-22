const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const HrSurveyDepartament = db.define('hr_survey_departament', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    surveyId: { type: DataTypes.INTEGER, allowNull: false, field: 'survey_id' },
    departamentId: { type: DataTypes.INTEGER, allowNull: false, field: 'departament_id' },
}, {
    tableName: 'hr_survey_departaments',
    indexes: [{ unique: true, fields: ['survey_id', 'departament_id'] }],
});

module.exports = HrSurveyDepartament;
