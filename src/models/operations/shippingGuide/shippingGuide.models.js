const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ShippingGuide = db.define('shipping_guide', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  counter: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateStartTraslate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'date_start_traslate'
  },
  dateEndTraslate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'date_end_traslate'
  },
  sale: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  buy: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  other: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  from: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  to: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  addressee: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'destinatario',
  },
  addresseeRuc: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'destinatario_ruc'
  },
  carrier: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transportista',
  },
  carrierRuc: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transportista_ruc',
  },
  carrierLicence: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transportista_placa',
  },
  file: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

module.exports = ShippingGuide;