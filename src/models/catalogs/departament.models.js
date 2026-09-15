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
    },
    indicators: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    responsibleStaffId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "responsible_staff_id",
    },

});

module.exports = Departaments;