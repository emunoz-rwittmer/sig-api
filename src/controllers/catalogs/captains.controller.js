const CaptainService = require('../../services/catalogs/captains.services');
const Utils = require('../../utils/Utils');
const sendEmail = require('../../utils/mailer');
const bcrypt = require("bcrypt");

const getAllCaptains = async (req, res) => {
    try {
        const result = await CaptainService.getAll();
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

const getCaptain = async (req, res) => {
    try {
        const captainId = Utils.decode(req.params.captain_id);
        const result = await CaptainService.getCaptainById(captainId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createCaptain = async (req, res) => {
    try {
        const captain = req.body;
        captain.yachtId = Utils.decode(req.body.yachtId)
        const result = await CaptainService.createCaptain(captain);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateCaptain = async (req, res) => {
    try {
        const captainId = Utils.decode(req.params.captain_id);
        const captain = req.body;
        captain.yachtId = Utils.decode(req.body.yachtId)
        const result = await CaptainService.updateCaptain(captain, {
            where: { id: captainId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteCaptain = async (req, res) => {
    try {
        const captainId = Utils.decode(req.params.captain_id);
        const result = await CaptainService.delete(captainId);
        res.status(200).json({ data: result })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

// CAPITAN - YACHT

const getAllYachts = async (req, res) => {
    try {
        const captainId = Utils.decode(req.params.captain_id)
        const result = await CaptainService.getAllYachts(captainId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
            result.yacht_id = Utils.encode(result.yacht_id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const assingYacht = async (req, res) => {
    try {
        const data = {};
        data.captainId = Utils.decode(req.params.captain_id)
        data.yachtId = Utils.decode(req.body.yachti_id)
        const result = await CaptainService.assingYacht(data);
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
        const result = await CaptainService.deleteYacht({
            where: { id: yachtId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const CaptainController = {
    getAllCaptains,
    getCaptain,
    createCaptain,
    updateCaptain,
    deleteCaptain,
    getAllYachts,
    assingYacht,
    deleteYacht
}
module.exports = CaptainController