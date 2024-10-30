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
  percent: {
    type: DataTypes.STRING,
    allowNull: false,
  }, 
});

module.exports = Tabulation;