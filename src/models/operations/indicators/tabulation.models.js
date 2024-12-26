const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Tabulation = db.define('tabulation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  indicatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'indicator_id'
  },
  a: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }, 
  b: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }, 
  percent: {
    type: DataTypes.FLOAT(8,2),
    allowNull: true,
  }, 
});

module.exports = Tabulation;