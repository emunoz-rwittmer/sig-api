const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Order = db.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id'
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
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Order;