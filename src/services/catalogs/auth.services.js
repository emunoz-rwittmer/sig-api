const Users = require('../../models/catalogs/user.models');
const Captain = require('../../models/catalogs/captains.models');
const Crew = require('../../models/catalogs/crews.models'); 
const Roles = require('../../models/catalogs/roles.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

    static async loginCaptains(credentials) {
        try {
            const { email, password } = credentials;
            const user = await Captain.findOne({
                where: { email },
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

    static async loginCrews(password) {
        try {
            const user = await Crew.findOne({
                where: { password },
            });
            return user
        } catch (error) {
            throw error;
        }
    }

    static async upgradePassword(user) {
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
}

module.exports = AuthService;