const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const ReadRegulation = db.define('read_regulation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'staff_id'
    },
    regulationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'regulation_id'
    },
    reed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
});

module.exports = ReadRegulation;