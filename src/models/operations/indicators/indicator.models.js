const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Indicator = db.define('indicator', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  departamentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'departament_id'
  },
  formulaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'formula_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  process: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  reading: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  follow: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  formula: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  goal: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'goal'
  },
  typeGoal: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'type_goal'
  },
  timeType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'time_type'
  }
  
});

module.exports = Indicator;