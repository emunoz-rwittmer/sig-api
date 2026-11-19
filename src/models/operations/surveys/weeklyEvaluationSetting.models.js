const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

// Si el cron semanal crea evaluaciones para la empresa (barco). Sin fila = activo.
const WeeklyEvaluationSetting = db.define('weekly_evaluation_setting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'company_id',
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
});

module.exports = WeeklyEvaluationSetting;
