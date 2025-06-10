const ProcesService = require('../../../services/operations/indicators/proces.services');
const Utils = require('../../../utils/Utils');

const getAllProcess = async (req, res) => {
    try {
        const result = await ProcesService.getAll();
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

const getProces = async (req, res) => {
    try {
        const id = Utils.decode(req.params.proces_id);
        const result = await ProcesService.getProcesById(id);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error.message)
    }
}

const createProces = async (req, res) => {
    try {
        const data = req.body;
        const result = await ProcesService.createProces(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(500).json(error.message);
    }
}



const updateProces = async (req, res) => {
    try {
        const id = Utils.decode(req.params.proces_id);
        const data = req.body;
        const result = await ProcesService.updateProces(data, {
            where: { id },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const deleteProces = async (req, res) => {
    try {
        const id = Utils.decode(req.params.proces_id);
        const result = await ProcesService.delete({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        
        res.status(500).json(error.message);
    }
}

const ProcesController = {
    getAllProcess,
    getProces,
    createProces,
    updateProces,
    deleteProces
}
module.exports = ProcesController