const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const ProductBar = db.define('product_bar', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'nombre_producto'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'categoria'
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'precio'
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'imagen'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: 0,
  },
});

module.exports = ProductBar;