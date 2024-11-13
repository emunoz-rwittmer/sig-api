const db = require('../../../utils/database');
const { DataTypes } = require('sequelize');

const PlacesYacht = db.define('placesYacht', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "product_id",
    },
    configurationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "configuration_id",
    },
});

module.exports = PlacesYacht;