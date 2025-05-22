const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ComentCardQuestions = db.define('coment_card_questions', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    comentCardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'coment_card_id'
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    puntuacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    opciones: {
        type: DataTypes.JSON // Almacena opciones como un JSON
    }

});

module.exports = ComentCardQuestions;