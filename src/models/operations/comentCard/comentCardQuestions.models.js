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
    title: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    scaleMin: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    scaleMax: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    options: {
        type: DataTypes.JSON, // Almacena opciones como un JSON
        field: 'opciones'
    }

});

module.exports = ComentCardQuestions;