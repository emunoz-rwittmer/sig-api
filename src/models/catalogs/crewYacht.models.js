const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const CrewYacht= db.define('crewYacht',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    crewId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"crew_id",
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"yacht_id",
    },
});

module.exports = CrewYacht;