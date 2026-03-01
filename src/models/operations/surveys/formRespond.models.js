const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const FormRespond = db.define('form_respond', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  companyId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'company_id'
  },
  formId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'form_id'
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
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
  periodWeek: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = FormRespond;