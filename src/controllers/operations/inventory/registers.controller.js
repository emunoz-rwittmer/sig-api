const axios = require('axios');
const RegisterService = require('../../../services/operations/inventory/registers.services');


const getAllRegisters = async (req, res) => {
    try {
        const result = await RegisterService.getAllRegisters();
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const RegisterController = {
    getAllRegisters,
}
module.exports = RegisterController