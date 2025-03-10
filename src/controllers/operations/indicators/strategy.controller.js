const StrategyService = require('../../../services/operations/indicators/strategy.services');
const Utils = require('../../../utils/Utils');

const getAllStrategys = async (req, res) => {
    try {
        const result = await StrategyService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(500).json(error.message)
    }
}

const getStrategy = async (req, res) => {
    try {
        const id = Utils.decode(req.params.level_id);
        const result = await StrategyService.getStrategyById(id);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error.message)
    }
}

const createStrategy = async (req, res) => {
    try {
        const data = req.body;
        const result = await StrategyService.createStrategy(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(500).json(error.message);
    }
}



const updateStrategy = async (req, res) => {
    try {
        const id = Utils.decode(req.params.level_id);
        const data = req.body;
        const result = await StrategyService.updateStrategy(data, {
            where: { id },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const deleteStrategy = async (req, res) => {
    try {
        const id = Utils.decode(req.params.level_id);
        const result = await StrategyService.delete({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        
        res.status(500).json(error.message);
    }
}

const StrategyController = {
    getAllStrategys,
    getStrategy,
    createStrategy,
    updateStrategy,
    deleteStrategy
}
module.exports = StrategyController