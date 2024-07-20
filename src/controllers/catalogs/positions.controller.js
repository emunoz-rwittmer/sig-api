const PositionService = require('../../services/catalogs/positions.services');
const Utils = require('../../utils/Utils');

const getPositions = async (req, res) => {
    try {
        const result = await PositionService.getAll();
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


const PositionsController = {
    getPositions
}

module.exports = PositionsController 
