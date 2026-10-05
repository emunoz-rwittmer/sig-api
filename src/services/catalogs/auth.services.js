const Users = require('../../models/catalogs/user.models');
const Staff = require('../../models/catalogs/staff.models');
const Roles = require('../../models/catalogs/roles.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Positions = require('../../models/catalogs/positions.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const Company = require('../../models/catalogs/company.models');
const AppError = require('../../errors/AppError');

require('dotenv').config();

// Mayúscula, minúscula y número; 6 a 14 caracteres (mismo criterio que el formulario)
const STAFF_PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,14}$/;

class AuthService {

    static async login(credentials) {
        try {
            const { email, password } = credentials;
            const user = await Users.findOne({
                where: { email },
                include: [{
                    model: Roles,
                    as: 'user_rol',
                    attributes: ["id", "name"]
                }]
            });
            if (user) {
                const isValid = bcrypt.compareSync(password, user.password);
                return isValid ? { isValid, user } : { isValid }
            }
            return { isValid: false }
        } catch (error) {
            throw error;
        }
    }

    static async loginStaffs(credentials) {
        try {
            const { email, password } = credentials;
            const user = await Staff.findOne({
                where: { email },
                include:[{
                    model: Roles,
                    as: 'rol',
                    attributes: ['id', 'name'],
                },{
                    model: StaffCompany,
                    as: 'companies',
                    attributes: ["companyId"],
                }]
            });
            if (user) {
                const isValid = bcrypt.compareSync(password, user.password);
                return isValid ? { isValid, user } : { isValid }
            }
            return { isValid: false }
        } catch (error) {
            throw error;
        }
    }

    static async userUpgradePassword(user) {
        try {
            const result = await Users.update(
                { password: user.password, changePassword: user.changePassword },
                {
                    where: { id: user.id }
                }
            );
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async staffUpgradePassword(user) {
        try {
            const result = await Staff.update(
                { password: user.password, changePassword: user.changePassword },
                {
                    where: { id: user.id }
                }
            );
            return result;
        } catch (error) {
            throw error;
        }
    }
    static async changeStaffPassword({ staffId, currentPassword, newPassword }) {
        if (!currentPassword || !newPassword) {
            throw new AppError('Contraseña actual y nueva son requeridas', 400);
        }
        if (!STAFF_PASSWORD_POLICY.test(newPassword)) {
            throw new AppError('La nueva contraseña debe tener entre 6 y 14 caracteres, con mayúscula, minúscula y número', 400);
        }

        const staff = await Staff.findByPk(staffId);
        if (!staff || !staff.active) {
            throw new AppError('Usuario no encontrado', 404);
        }
        if (!bcrypt.compareSync(currentPassword, staff.password)) {
            throw new AppError('La contraseña actual es incorrecta', 400);
        }

        await Staff.update(
            { password: bcrypt.hashSync(newPassword, 10), changePassword: false },
            { where: { id: staffId } }
        );
    }
}

module.exports = AuthService;