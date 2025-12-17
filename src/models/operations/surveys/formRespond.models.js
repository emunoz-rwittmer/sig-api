const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const FormRespond = db.define('form_respond', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  yachtId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'yacht_id'
  },
  formId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'form_id'
  },
  stateId: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'state_id'
  },
  evaluator: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'evaluator'
  },
  evaluated: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'evaluated'
  },
  expirationDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = FormRespond;