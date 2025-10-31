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
    defaultValue: false,
  },
  buy: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  other: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  from: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  to: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  addressee: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'destinatario',
  },
  addresseeRuc: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'destinatarioRuc'
  },
  carrier: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  carrierRuc: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  carrierLicence: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

module.exports = Guide;