const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const Tabulation = db.define('tabulation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  indicatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'indicator_id'
  },
  // Periodo que mide el dato (independiente de `createdAt`, que es cuándo
  // se registró). Nullable: filas históricas no lo tienen y el gráfico
  // mensual de métricas simplemente las omite.
  periodMonth: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: true,
    field: 'period_month',
  },
  periodYear: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: true,
    field: 'period_year',
  },
  a: {
    type: DataTypes.BIGINT,
    allowNull: true,
  }, 
  b: {
    type: DataTypes.BIGINT,
    allowNull: true,
  }, 
  percent: {
    type: DataTypes.FLOAT(8,2),
    allowNull: true,
  }, 
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
  }, 
});

module.exports = Tabulation;