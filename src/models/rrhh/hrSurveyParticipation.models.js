const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Registra QUIEN participó (sin vínculo a sus respuestas). Sin fechas.
const HrSurveyParticipation = db.define('hr_survey_participation', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    surveyId: { type: DataTypes.INTEGER, allowNull: false, field: 'survey_id' },
    staffId: { type: DataTypes.INTEGER, allowNull: false, field: 'staff_id' },
    departamentId: { type: DataTypes.INTEGER, allowNull: false, field: 'departament_id' },
    positionId: { type: DataTypes.INTEGER, allowNull: true, field: 'position_id' },
    staffType: { type: DataTypes.STRING(20), allowNull: true, field: 'staff_type' },
}, {
    tableName: 'hr_survey_participations',
    timestamps: false,
    // Un trabajador participa una sola vez por encuesta (garantiza el 409 en doble envío).
    indexes: [{ unique: true, fields: ['survey_id', 'staff_id'] }],
});

module.exports = HrSurveyParticipation;
