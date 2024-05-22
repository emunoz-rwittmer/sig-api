const CrewService = require('../../services/catalogs/crews.services');
const Utils = require('../../utils/Utils');

const getAllCrews = async (req, res) => {
    try {
        const result = await CrewService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getCrew = async (req, res) => {
    try {
        const crewId = Utils.decode(req.params.crew_id);
        const result = await CrewService.getCrewById(crewId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createCrew = async (req, res) => {
    try {
        const crew = req.body;
        crew.yachtId = Utils.decode(req.body.yachtId)
        const result = await CrewService.createCrew(crew);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateCrew = async (req, res) => {
    try {
        const crewId = Utils.decode(req.params.crew_id);
        const crew = req.body;
        crew.yachtId = Utils.decode(req.body.yachtId)
        const result = await CrewService.updateCrew(crew, {
            where: { id: crewId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteCrew = async (req, res) => {
    try {
        const crewId = Utils.decode(req.params.crew_id);
        const result = await CrewService.delete(crewId);
        res.status(200).json({ data: result })
    } catch (error) {
        res.status(400).json(error.message);
    }
}

// CAPITAN - YACHT

const getAllYachts = async (req, res) => {
    try {
        const crewId = Utils.decode(req.params.crew_id)
        const result = await CrewService.getAllYachts(crewId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
            result.yacht_id = Utils.encode(result.yacht_id);
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const assingYacht = async (req, res) => {
    try {
        const data = {};
        data.crewId = Utils.decode(req.params.crew_id)
        data.yachtId = Utils.decode(req.body.yachti_id)
        const result = await CrewService.assingYacht(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteYacht = async (req, res) => {
    try {
        const yachtId = req.params.id;
        const result = await CrewService.deleteYacht({
            where: { id: yachtId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const CrewController = {
    getAllCrews,
    getCrew,
    createCrew,
    updateCrew,
    deleteCrew,
    getAllYachts,
    assingYacht,
    deleteYacht
}
module.exports = CrewController