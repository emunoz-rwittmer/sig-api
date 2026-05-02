const db = require('../../utils/database');
const { DataTypes } = require('sequelize');
const { fields } = require('../../utils/multer');

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
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'precio'
  },
  type: {
    type: DataTypes.ENUM("DIRECT", "RECIPE"),
    allowNull: false
  },
  productId: {
    type: DataTypes.INTEGER,
    field: 'product_id'
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