const Users = require('../../models/catalogs/user.models');
const Staff = require('../../models/catalogs/staff.models');
const Roles = require('../../models/catalogs/roles.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Positions = require('../../models/catalogs/positions.models');

require('dotenv').config();

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

    static async loginUsers(credentials) {
        try {
            const { email, password } = credentials;
            const user = await Staff.findOne({
                where: { email },
                include:[{
                    model: Roles,
                    as: 'rol',
                    attributes: ['id', 'name'],
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
}

module.exports = AuthService;