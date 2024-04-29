const Users = require('../../models/catalogs/user.models');
const Roles = require('../../models/catalogs/roles.models');
const { Op, where } = require("sequelize");



class RoleService {
    static async getAll() {
        try {
            const result = await Roles.findAll({
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  RoleService;