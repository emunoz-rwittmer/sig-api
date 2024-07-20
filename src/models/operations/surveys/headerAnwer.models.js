const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const HeaderAnswer = db.define('headerAnswer', {
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
  yachtId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'yacht_id'
  },
  stateId: {
    type: DataTypes.INTEGER,
    defaultValue: false,
    ield: 'state_id'
  },
  evaluator: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  evaluated: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  expirationDate: {
    type: DataTypes.DATE,
    defaultValue: false,
  },
});

module.exports = HeaderAnswer;