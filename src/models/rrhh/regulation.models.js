const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Regulation = db.define('regulation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    file: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'display_order',
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id'
    },
});

module.exports = Regulation;