const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const ComentCardRespond = db.define('respuesta_coment_card', {

    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    cardYachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"card_yacht_id",
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'nombre_completo'
    },
    isSubmited: { 
        type: DataTypes.BOOLEAN, 
        defaultValue:false 
    },

});

module.exports = ComentCardRespond;