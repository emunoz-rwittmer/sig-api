const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const CaptainYacht= db.define('captainYacht',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    captainId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"captain_id",
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"yacht_id",
    },
});

module.exports = CaptainYacht;