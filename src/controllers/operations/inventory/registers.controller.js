const RegisterService = require('../../../services/operations/inventory/registers.services');
const Utils = require('../../../utils/Utils');

const getAllRegisters = async (req, res) => {
    try {
        const result = await RegisterService.getAllRegisters();
        result.map(x => (
            x.dataValues.id = Utils.encode(x.dataValues.id),
            x.dataValues.companyId = Utils.encode(x.dataValues.companyId),
            x.dataValues.userId = Utils.encode(x.dataValues.userId)
        ))
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const RegisterController = {
    getAllRegisters,
}
module.exports = RegisterController