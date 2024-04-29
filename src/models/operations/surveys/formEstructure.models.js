const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const FormEstructure = db.define('formEstructure', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  formId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'form_id'
  },
  estructureQuestionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'estructure_question_id'
  }
});

module.exports = FormEstructure;