const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const StatusEvaluation = db.define('statusEvaluation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = StatusEvaluation;