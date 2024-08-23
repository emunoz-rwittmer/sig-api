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
  barCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'bar_code'
  },
  product: {
    type: DataTypes.STRING,
    allowNull: false
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
});

module.exports = itemsOrder;