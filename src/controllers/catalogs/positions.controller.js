const PositionService = require('../../services/catalogs/positions.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const encodePosition = (x) => {
    x.dataValues.id = Utils.encode(x.dataValues.id);
    if (x.dataValues.departamentId) {
        x.dataValues.departamentId = Utils.encode(x.dataValues.departamentId);
    }
    if (x.dataValues.departament) {
        x.dataValues.departament.dataValues.id = Utils.encode(x.dataValues.departament.dataValues.id);
    }
};

const getPositions = async (req, res, next) => {
    try {
        const [result, counts] = await Promise.all([
            PositionService.getAll(),
            PositionService.getStaffAndDocumentCounts(),
        ]);
        if (result instanceof Array) {
            result.map((x) => {
                const rawId = x.dataValues.id;
                x.dataValues.staffCount = counts.staffByPosition[rawId] ?? 0;
                x.dataValues.documentsCount = counts.documentsByPosition[rawId] ?? 0;
                encodePosition(x);
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
        encodePosition(result);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createPosition = async (req, res, next) => {
    try {
        const position = req.body;
        position.departamentId = position.departamentId ? Utils.decode(position.departamentId) : null;
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
        position.departamentId = position.departamentId ? Utils.decode(position.departamentId) : null;
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
