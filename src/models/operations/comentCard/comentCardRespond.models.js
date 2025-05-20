const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ComentCardRespond = db.define('respuesta_coment_card', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    cardQrId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"card_qr_id",
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
        defaultValue:false 
    },

});

module.exports = ComentCardRespond;