const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const HrSurvey = db.define('hr_survey', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    startsAt: { type: DataTypes.DATEONLY, allowNull: true, field: 'starts_at' },
    endsAt: { type: DataTypes.DATEONLY, allowNull: true, field: 'ends_at' },
    displayOrder: { type: DataTypes.INTEGER, allowNull: true, field: 'display_order' },
    // Por defecto es borrador (a diferencia de inducciones).
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'hr_surveys' });

module.exports = HrSurvey;
