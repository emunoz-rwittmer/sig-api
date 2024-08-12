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

const getPosition = async (req, res) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const result = await PositionService.getPositionById(positionId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createPosition = async (req, res) => {
    try {
        const position = req.body;
        const result = await PositionService.createPosition(position);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updatePosition = async (req, res) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const position = req.body;
        const result = await PositionService.updatePosition(position, {
            where: { id: positionId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deletePosition = async (req, res) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const result = await PositionService.delete(positionId);
        res.status(200).json({ data: result })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}


const PositionsController = {
    getPositions,
    getPosition,
    createPosition,
    updatePosition,
    deletePosition
}

module.exports = PositionsController 
