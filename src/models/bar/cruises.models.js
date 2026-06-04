const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const Cruise = db.define('cruise', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'yacht_id'
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    barman: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    itinerary: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    transferDay: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'transfer_day',
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
    cruiseState: {
        type: DataTypes.STRING,
        defaultValue: 'open',
        field: 'cruise_state',
    },
    urlPDFReport: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'url_reporte_pdf',
    },
    urlExcelReport: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'url_reporte_excel',
    },

});

module.exports = Cruise;