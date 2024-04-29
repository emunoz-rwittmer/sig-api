const YachtService = require('../../services/catalogs/yachts.services');
const Utils = require('../../utils/Utils');
const sendEmail = require('../../utils/mailer');
const bcrypt = require("bcrypt");

const getAllYachts = async (req, res) => {
    try {
        const result = await YachtService.getAll();
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

const getYacht = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const result = await YachtService.getYachtById(yachtId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createYacht = async (req, res) => {
    try {
        const yacht = req.body;
        const result = await YachtService.createYacht(yacht);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}



const updateYacht = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const yacht = req.body;
        const result = await YachtService.updateYacht(yacht, {
            where: { id: yachtId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteYacht = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const result = await YachtService.delete({
            where: { id: yachtId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const YachtController = {
    getAllYachts,
    getYacht,
    createYacht,
    updateYacht,
    deleteYacht
}
module.exports = YachtController