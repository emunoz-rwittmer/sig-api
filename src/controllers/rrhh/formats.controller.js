const FormatService = require('../../services/rrhh/formats.services');
const Utils = require('../../utils/Utils');

const getAllFormats = async (req, res) => {
    try {
        const result = await FormatService.getAll();
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

const getFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const result = await FormatService.getFormatById(formatId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        console.log(result)
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createFormat = async (req, res) => {
    try {
        const data = req.body;
        const result = await FormatService.createFormat(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const data = req.body;
        await FormatService.updateFormat(data, {
            where: { id: formatId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        await FormatService.delete({
            where: { id: formatId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}


const FormatController = {
    getAllFormats,
    getFormat,
    createFormat,
    updateFormat,
    deleteFormat,
}
module.exports = FormatController