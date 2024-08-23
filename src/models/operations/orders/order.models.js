const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Order = db.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  yachtId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'yacht_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'

  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Order;