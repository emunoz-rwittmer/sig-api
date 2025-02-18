const ProbabilityService = require('../../../services/operations/indicators/probability.services');
const Utils = require('../../../utils/Utils');

const getAllProbabilities = async (req, res) => {
    try {
        const result = await ProbabilityService.getAll();
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

const getProbability = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.probability_id);
        const result = await ProbabilityService.getProbabilityById(yachtId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error.message)
    }
}

const createProbability = async (req, res) => {
    try {
        const data = req.body;
        const result = await ProbabilityService.createProbability(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(500).json(error.message);
    }
}



const updateProbability = async (req, res) => {
    try {
        const id = Utils.decode(req.params.probability_id);
        const data = req.body;
        const result = await ProbabilityService.updateProbability(data, {
            where: { id },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const deleteProbability = async (req, res) => {
    try {
        const id = Utils.decode(req.params.probability_id);
        const result = await ProbabilityService.delete({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        
        res.status(500).json(error.message);
    }
}

const ProbabilityController = {
    getAllProbabilities,
    getProbability,
    createProbability,
    updateProbability,
    deleteProbability
}
module.exports = ProbabilityController