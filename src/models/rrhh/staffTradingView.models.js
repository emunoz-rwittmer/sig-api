const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Registro de qué colaborador ya revisó qué contenido de "Infórmate".
const StaffTradingView = db.define('staff_trading_view', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'staff_id',
    },
    tradingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'trading_id',
    },
    viewedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'viewed_at',
    },
}, {
    indexes: [{ unique: true, fields: ['staff_id', 'trading_id'] }],
});

module.exports = StaffTradingView;
