const TradingService = require('../../services/rrhh/trading.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const getAllTradings = async (req, res, next) => {
    try {
        const result = await TradingService.getAll();
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

const getTrading = async (req, res, next) => {
    try {
        const tradingId = decodeId(req.params.trading_id, 'trading_id');
        const result = await TradingService.getTradingById(tradingId);
        if (!result) {
            throw new AppError('Trading no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createTrading = async (req, res, next) => {
    try {
        const data = req.body;
        if (req.file) {
            data.url = `/uploads/pdfs/${req.file.filename}`
        }
        if (!data.url) {
            throw new AppError('No se ha subido ningún archivo', 400);
        }
        const result = await TradingService.createTrading(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateTrading = async (req, res, next) => {
    try {
        const tradingId = decodeId(req.params.trading_id, 'trading_id');
        const data = req.body;
        if (req.file) {
            data.url = `/uploads/pdfs/${req.file.filename}`
        }
        await TradingService.updateTrading(data, {
            where: { id: tradingId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteTrading = async (req, res, next) => {
    try {
        const tradingId = decodeId(req.params.trading_id, 'trading_id');
        await TradingService.delete({
            where: { id: tradingId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
    }
}


const TradingController = {
    getAllTradings,
    getTrading,
    createTrading,
    updateTrading,
    deleteTrading,
}
module.exports = TradingController
