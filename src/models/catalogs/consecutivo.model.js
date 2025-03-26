const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Consecutivo = db.define('consecutivo',{
    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true
    }, 
    valor: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
});

module.exports = Consecutivo;