const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Memos e incumplimientos del reglamento interno que descalifican el bono de
// desempeño. Se registran a mano — no existe otra fuente de estos datos.
const BonusIncident = db.define('bonus_incident', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    staffId: { type: DataTypes.INTEGER, allowNull: false, field: 'staff_id' },
    kind: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['memo', 'reglamento']] } },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
});

module.exports = BonusIncident;
