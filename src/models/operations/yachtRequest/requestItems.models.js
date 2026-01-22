const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const RequestItems = db.define('request_items', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  requestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'request_id'
  },
  configurationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'configuration_id'
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = RequestItems;