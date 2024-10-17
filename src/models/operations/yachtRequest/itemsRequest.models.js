const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const itemsRequest = db.define('itemsRequest', {
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
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id'
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

module.exports = itemsRequest;