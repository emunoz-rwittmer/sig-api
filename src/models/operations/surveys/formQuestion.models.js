const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const FormQuestion = db.define('form_question', {
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

module.exports = FormQuestion;