const ImpactService = require('../../../services/operations/indicators/impact.services');
const Utils = require('../../../utils/Utils');

const getAllImpacts = async (req, res) => {
    try {
        const result = await ImpactService.getAll();
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

const getImpact = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.impact_id);
        const result = await ImpactService.getImpactById(yachtId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error.message)
    }
}

const createImpact = async (req, res) => {
    try {
        const data = req.body;
        const result = await ImpactService.createImpact(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(500).json(error.message);
    }
}



const updateImpact = async (req, res) => {
    try {
        const id = Utils.decode(req.params.impact_id);
        const data = req.body;
        const result = await ImpactService.updateImpact(data, {
            where: { id },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const deleteImpact = async (req, res) => {
    try {
        const id = Utils.decode(req.params.impact_id);
        const result = await ImpactService.delete({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        
        res.status(500).json(error.message);
    }
}

const ImpactController = {
    getAllImpacts,
    getImpact,
    createImpact,
    updateImpact,
    deleteImpact
}
module.exports = ImpactController