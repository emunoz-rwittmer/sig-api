const TradingService = require('../../services/rrhh/trading.services');
const Utils = require('../../utils/Utils');

const getAllTradings = async (req, res) => {
    try {
        const result = await TradingService.getAll();
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

const getTrading = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await TradingService.getTradingById(companyId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createTrading = async (req, res) => {
    try {
        const data = req.body;
        if(req.file) data.url = `/uploads/pdfs/${req.file.filename}`
        const result = await TradingService.createTrading(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateTrading = async (req, res) => {
    try {
        const tradingId = Utils.decode(req.params.trading_id);
        const data = req.body;
        await TradingService.updateTrading(data, {
            where: { id: tradingId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteTrading = async (req, res) => {
    try {
        const TradingId = Utils.decode(req.params.trading_id);
        await TradingService.delete({
            where: { id: TradingId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
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