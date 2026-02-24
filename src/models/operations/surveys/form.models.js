const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Form = db.define('form', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  positions: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'positions'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
});

module.exports = Form;