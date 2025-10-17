const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const ConsecutivoGuias = db.define('consecutivo_guias', {
    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id',
    },
    valor: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
});

module.exports = ConsecutivoGuias;