const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ComentCardYacht = db.define('coment_card_yacht', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    carId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'coment_card_id',
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'yacht_id',
    },
});

module.exports = ComentCardYacht;