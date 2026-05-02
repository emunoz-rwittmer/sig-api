const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Stock = db.define('stock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id'
  },
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'warehouse_id'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'company_id'
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

module.exports = Stock;