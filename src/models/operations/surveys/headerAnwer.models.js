const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const HeaderAnswer = db.define('headerAnswer', {
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
  evaluatorId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'evaluator_id'
  },
  evaluatedId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'evaluated_id'
  },
  expirationDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = HeaderAnswer;