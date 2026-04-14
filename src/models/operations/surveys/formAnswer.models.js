const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const FormAnswer = db.define('formAnswer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  headerAnswerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'header_answer_id'
  },
  estructureQuestionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'estructure_question_id'
  },
  answer: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  description: {
    type: DataTypes.JSON
  }
});

module.exports = FormAnswer;