const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const shippingGuideItems = db.define('shipping_guide_items', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  guideId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'guide_id'
  },
  quantity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  detail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = shippingGuideItems;