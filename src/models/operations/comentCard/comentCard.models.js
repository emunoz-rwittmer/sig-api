const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ComentCard = db.define('coment_card', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

module.exports = ComentCard;