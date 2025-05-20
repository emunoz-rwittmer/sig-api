const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ComentCardQR = db.define('coment_card_qr', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    comentCardYachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'coment_card_yacht_id',
    },
    accessLink: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'access_link',
    },
});

module.exports = ComentCardQR;