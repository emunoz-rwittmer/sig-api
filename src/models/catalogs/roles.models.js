const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Roles = db.define('role', {

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

module.exports = Roles;