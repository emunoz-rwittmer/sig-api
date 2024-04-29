const RoleService = require('../../services/catalogs/roles.services');
const Utils = require('../../utils/Utils');
const transporter = require('../../utils/mailer');
const bcrypt = require("bcrypt");

const getRoles = async (req, res) => {
    try {
        const result = await RoleService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}


const RolesController = {
    getRoles
}

module.exports = RolesController 
