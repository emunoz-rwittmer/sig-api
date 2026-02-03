const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const StaffCompany= db.define('staff_company',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"staff_id",
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"company_id",
    },
});

module.exports = StaffCompany;