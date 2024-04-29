const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const EstructureQuestion = db.define('estructureQuestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  pregunta: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tipoRespuesta: {
    type: DataTypes.STRING,
    allowNull: false
  },
  opciones: {
    type: DataTypes.JSON // Almacena opciones como un JSON
  }
});

module.exports = EstructureQuestion;