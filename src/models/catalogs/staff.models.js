const db = require('../../utils/database');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

const Staff= db.define('staff',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field:"first_name",
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        field:"last_name",
    },
    email: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        validate:{
            isEmail: true,
        }
    },
    cellPhone: {
        type: DataTypes.STRING,
        allowNull: false,
        field:"cell_phone",
    },
    company: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field:"role_id",
    },
    departamentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"departament_id",
    }, 
    positionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field:"position_id",
    }, 
    changePassword: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
},{
    hooks: {
        beforeCreate: (user, options) => {
            const { password } = user;
            const hash = bcrypt.hashSync(password, 10);
            user.password = hash;
        }
    }
});


module.exports = Staff;