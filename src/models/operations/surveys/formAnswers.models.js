const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const FormAnswers = db.define('form_answers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  respuestaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "respuesta_form_id",
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'pregunta_id'
  },
  answer: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'respuesta'
  },
  description: {
    type: DataTypes.JSON
  }
});

module.exports = FormAnswers;