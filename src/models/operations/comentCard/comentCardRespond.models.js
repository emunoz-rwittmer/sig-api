const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ComentCardRespond = db.define('coment_card_respond', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    cardQrId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "card_qr_id",
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'nombre_completo'
    },
    cabin: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cabin'
    },
    isSubmited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    readPolitics: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

});

module.exports = ComentCardRespond;