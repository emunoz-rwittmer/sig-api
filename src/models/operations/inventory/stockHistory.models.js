const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const StockHistory = db.define('stock_history', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  stockId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'stock_id'
  },
  responsable: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  max: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  min: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
});

module.exports = StockHistory;