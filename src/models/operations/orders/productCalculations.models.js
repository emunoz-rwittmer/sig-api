const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const productCalculations = db.define('productCalculations', {
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
  sixteenPax: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'sixteen_pax'
  },
  eighteenPax: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'eighteen_pax'
  },
  twentyPax: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'twenty_pax'
  },
  twentyTwoPax: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'twenty_two_pax'
  },
  twentyFourPax: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'twenty_four_pax'
  },
});

module.exports = productCalculations;