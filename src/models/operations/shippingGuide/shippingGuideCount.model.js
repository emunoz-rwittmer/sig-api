const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ShippingGuideCount = db.define('shipping_guide_count', {
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

module.exports = ShippingGuideCount;