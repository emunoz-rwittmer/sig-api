const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Register = db.define('register', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  counter: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'company_id'
  },
  products: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
  }, 
  isResived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'order_id'
  },
  receivedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'received_by'
  },
  receivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'received_at'
  },
  // null = sin novedad | 'pendiente' | 'resuelta'
  noveltyStatus: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'novelty_status'
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'resolved_by'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  },
});

module.exports = Register;