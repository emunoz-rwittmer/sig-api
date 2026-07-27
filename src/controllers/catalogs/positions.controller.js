const PositionService = require('../../services/catalogs/positions.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getPositions = async (req, res, next) => {
    try {
        const result = await PositionService.getAll();
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

const getPosition = async (req, res, next) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const result = await PositionService.getPositionById(positionId);
        if (!result) {
            throw new AppError('Posición no encontrada', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createPosition = async (req, res, next) => {
    try {
        const position = req.body;
        const result = await PositionService.createPosition(position);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updatePosition = async (req, res, next) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const position = req.body;
        delete position.id
        await PositionService.updatePosition(position, {
            where: { id: positionId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deletePosition = async (req, res, next) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const result = await PositionService.delete(positionId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
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
