const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ShipmentDates = db.define('embarques', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  staffCompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'staff_company_id'
  },
  shipmentDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  dischargeDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
});

module.exports = ShipmentDates;