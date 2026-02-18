const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ComentCardAnswers = db.define('coment_card_answers', {
    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    respuestaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "respuesta_coment_card_id",
    },
    questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:'pregunta_id'
    },
    answer: {
        type: DataTypes.TEXT,
        allowNull: false,
        field:'respuesta'
    },
});

module.exports = ComentCardAnswers;