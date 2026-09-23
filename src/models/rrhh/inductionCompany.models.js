const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const InductionCompany = db.define('induction_company', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    inductionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'induction_id',
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id',
    },
});

module.exports = InductionCompany;
