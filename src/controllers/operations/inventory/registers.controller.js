const RegisterService = require('../../../services/operations/inventory/registers.services');

const getAllRegisters = async (req, res) => {
    try {
        const filter = req.query.filter;
        const result = await RegisterService.getAllRegisters(filter);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const RegisterController = {
    getAllRegisters,
}
module.exports = RegisterController