const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Recipe = db.define('recipe', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productBarId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
  },



});

module.exports = Recipe;