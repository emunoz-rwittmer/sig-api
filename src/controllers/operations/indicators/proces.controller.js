const ProcesService = require('../../../services/operations/indicators/proces.services');
const Utils = require('../../../utils/Utils');
const AppError = require('../../../errors/AppError');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const getAllProcess = async (req, res, next) => {
    try {
        const result = await ProcesService.getAll();
        result.forEach((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
            x.dataValues.departamentId = Utils.encode(x.dataValues.departamentId);
            if (x.dataValues.departamento) {
                x.dataValues.departamento.dataValues.id = Utils.encode(x.dataValues.departamento.id);
            }
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getProces = async (req, res, next) => {
    try {
        const id = decodeId(req.params.proces_id, 'proces_id');
        const result = await ProcesService.getProcesById(id);
        if (!result) throw new AppError('Proceso no encontrado', 404);
        result.dataValues.id = Utils.encode(result.id);
        result.dataValues.departamentId = Utils.encode(result.departamentId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createProces = async (req, res, next) => {
    try {
        const data = req.body;
        data.departamentId = decodeId(data.departamentId, 'departamentId');
        await ProcesService.createProces(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}

const updateProces = async (req, res, next) => {
    try {
        const id = decodeId(req.params.proces_id, 'proces_id');
        const data = req.body;
        data.departamentId = decodeId(data.departamentId, 'departamentId');
        delete data.id;
        await ProcesService.updateProces(data, {
            where: { id },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteProces = async (req, res, next) => {
    try {
        const id = decodeId(req.params.proces_id, 'proces_id');
        await ProcesService.delete({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' });
    } catch (error) {
        next(error);
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
