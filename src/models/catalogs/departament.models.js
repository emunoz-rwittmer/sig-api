const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Departaments = db.define('departaments', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    }

});

module.exports = Departaments;