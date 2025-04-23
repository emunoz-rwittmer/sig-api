const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Register = db.define('register', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  counter: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'company_id'
  },
  products: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
  }, 
  isResived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Register;