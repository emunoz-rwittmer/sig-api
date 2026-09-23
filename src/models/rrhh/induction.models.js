const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Induction = db.define('induction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    passingScore: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 70,
        field: 'passing_score',
    },
    maxAttempts: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 3,
        field: 'max_attempts',
    },
    // Cuántas preguntas del banco se muestran por intento (submuestra
    // aleatoria, ver inductionScoring.pickRandomQuestions). NULL o >= al
    // total de preguntas equivale a "mostrar todas" (pero igual se
    // randomiza el orden — ver inductionAttempts.services.js).
    questionsToShow: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: true,
        field: 'questions_to_show',
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
});

module.exports = Induction;
