const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const InductionProgress = db.define('induction_progress', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    inductionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'induction_id',
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'staff_id',
    },
    materialViewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'material_viewed_at',
    },
    extraAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'extra_attempts',
    },
});

module.exports = InductionProgress;
