const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Guide = db.define('Guide', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
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
    field: 'destinatarioRuc'
  },
  carrier: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  carrierRuc: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  carrierLicence: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  file: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

module.exports = Guide;