const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Formula = db.define('formula', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING, // Formula stored as text
    allowNull: false,
  },
 
});

module.exports = Formula;