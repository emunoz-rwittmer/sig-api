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
  // Sub-agrupación libre dentro del proceso (ej. "Compras" dentro de
  // "Administración"). Metadata de UI, no una FK.
  subprocess: {
    type: DataTypes.STRING,
    allowNull: true,
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
  // Etiquetas del numerador/denominador para la tabla y el gráfico de
  // métricas (ej. "Requerimientos atendidos" / "Total de requerimientos").
  // No participan en el cálculo (`formulaId` sigue siendo la fórmula real).
  numLabel: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'num_label',
  },
  denLabel: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'den_label',
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
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }

});

module.exports = Indicator;