const DepartamentService = require('../../services/catalogs/departaments.services');
const Utils = require('../../utils/Utils');

const getDepartaments = async (req, res) => {
    try {
        const result = await DepartamentService.getAll();
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


const DepartamentsController = {
    getDepartaments
}

module.exports = DepartamentsController 
