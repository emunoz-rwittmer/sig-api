const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const itemsOrder = db.define('itemsOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'order_id'
  },
  product: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  originalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'original_quantity'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = itemsOrder;