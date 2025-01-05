const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ProcessStaff = db.define('processStaff', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    processId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'process_id'
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'staff_id'
    },
});

module.exports = ProcessStaff;