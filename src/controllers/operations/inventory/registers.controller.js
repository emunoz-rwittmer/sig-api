const RegisterService = require('../../../services/operations/inventory/registers.services');
const Utils = require('../../../utils/Utils');

const getAllRegisters = async (req, res, next) => {
    try {
        const result = await RegisterService.getAllRegisters();
        result.map(x => (
            x.dataValues.id = Utils.encode(x.dataValues.id),
            x.dataValues.companyId = Utils.encode(x.dataValues.companyId),
            x.dataValues.userId = Utils.encode(x.dataValues.userId)
        ))
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const RegisterController = {
    getAllRegisters,
}
module.exports = RegisterController