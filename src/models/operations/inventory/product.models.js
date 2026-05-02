const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Product = db.define('product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM("DISCRETE", "CONSUMABLE"),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'unidad_medida'
  },
  presentationQuantity: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'presentacion'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Product;