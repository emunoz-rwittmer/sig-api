const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Request = db.define('request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'warehouse_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  group: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pax: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  cruise: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  supplyDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = Request;