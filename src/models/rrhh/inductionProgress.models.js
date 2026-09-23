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
    // Subconjunto de preguntas (ids) sorteado para el intento vigente —
    // se recalcula cada vez que `attemptsUsed` (ver selectedForAttempt)
    // avanza, así cada intento nuevo recibe un sorteo distinto, pero un
    // refresh de página en medio del mismo intento no lo cambia.
    selectedQuestionIds: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'selected_question_ids',
    },
    selectedForAttempt: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'selected_for_attempt',
    },
});

module.exports = InductionProgress;
