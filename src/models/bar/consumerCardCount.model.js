const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const ConsumerCardCount = db.define('consumer_card_count', {
    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true
    },
    yachtId: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        unique: true,
        field: 'yacht_id'
    },
    valor: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
});

module.exports = ConsumerCardCount;