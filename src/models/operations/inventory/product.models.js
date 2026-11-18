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
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'presentacion'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // false = no se lleva stock (p. ej. lencería): los movimientos se registran pero no validan ni mueven cantidades.
  controlsStock: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'controls_stock'
  },
  // Producto duplicado que se fusionó en otro (el proveedor cambió el código de barras):
  // su SKU sigue llegando en pedidos y debe resolverse al producto vigente.
  mergedIntoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'merged_into_id'
  }
});

module.exports = Product;