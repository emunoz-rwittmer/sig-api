const CruiseService = require('../../services/bar/cruise.services');
const Utils = require('../../utils/Utils');

const getAllCruises = async (req, res) => {
    try {
        const result = await CruiseService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.yachtId = Utils.encode(x.dataValues.yachtId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getCruise = async (req, res) => {
    try {
        const cruiseId = Utils.decode(req.params.cruise_id);
        const result = await CruiseService.getCruiseById(cruiseId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createCruise = async (req, res) => {
    try {
        const cruise = req.body;
        cruise.logo = `/uploads/companies/${req.files[0].filename}`
        const result = await CruiseService.createCruise(cruise);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateCruise = async (req, res) => {
    try {
        const cruiseId = Utils.decode(req.params.cruise_id);
        const cruise = req.body;
        if (req.files.length > 0) {
            cruise.logo = `/uploads/companies/${req.files[0].filename}`
        }
        await CruiseService.updateCruise(cruise, {
            where: { id: cruiseId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteCruise = async (req, res) => {
    try {
        const cruiseId = Utils.decode(req.params.cruise_id);
        const result = await CruiseService.delete({
            where: { id: cruiseId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        
        res.status(400).json(error.message);
    }
}

const CruiseController = {
    getAllCruises,
    getCruise,
    createCruise,
    updateCruise,
    deleteCruise
}
module.exports = CruiseController