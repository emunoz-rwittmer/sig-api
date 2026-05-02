const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Transaction = db.define('transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  registerId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'register_id'
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reference_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id'
  },
  warehouseFromId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'warehouse_from_id'
  },
  warehouseToId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'warehouse_to_id'
  },
  type: {
    type: DataTypes.ENUM("IN", "OUT", "ADJUST", "BAR_CONSUMPTION"),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Transaction;