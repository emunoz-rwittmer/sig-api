const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Positions = db.define('positions', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    departamentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "departament_id",
    },
    level: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isIn: [['operational', 'supervision', 'management']],
        },
    }

});

module.exports = Positions;