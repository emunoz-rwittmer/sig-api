const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Form = db.define('form', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  positionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'position_id'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
});

module.exports = Form;