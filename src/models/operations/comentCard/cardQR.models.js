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
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'access_link',
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_date',
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_date',
    },
});

module.exports = ComentCardQR;