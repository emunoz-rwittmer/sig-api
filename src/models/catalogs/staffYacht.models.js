const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const StaffYacht= db.define('staffYacht',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"staff_id",
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"yacht_id",
    },
});

module.exports = StaffYacht;