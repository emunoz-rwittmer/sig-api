const RoleService = require('../../services/catalogs/roles.services');
const Utils = require('../../utils/Utils');

const getRoles = async (req, res, next) => {
    try {
        const result = await RoleService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}


const RolesController = {
    getRoles
}

module.exports = RolesController
