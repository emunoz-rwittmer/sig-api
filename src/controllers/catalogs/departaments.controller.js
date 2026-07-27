const DepartamentService = require('../../services/catalogs/departaments.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getDepartaments = async (req, res, next) => {
    try {
        const result = await DepartamentService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getDepartament = async (req, res, next) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const result = await DepartamentService.getDepartamentById(departamentId);
        if (!result) {
            throw new AppError('Departamento no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getProcessById = async (req, res, next) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const result = await DepartamentService.getProcessById(departamentId);
        if (!result) {
            throw new AppError('Proceso no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createDepartament = async (req, res, next) => {
    try {
        const departament = req.body;
        const result = await DepartamentService.createDepartament(departament);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateDepartament = async (req, res, next) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const departament = req.body;
        delete departament.id
        await DepartamentService.updateDepartament(departament, {
            where: { id: departamentId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteDepartament = async (req, res, next) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const result = await DepartamentService.delete(departamentId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}


const DepartamentsController = {
    getDepartaments,
    getDepartament,
    getProcessById,
    createDepartament,
    updateDepartament,
    deleteDepartament
}

module.exports = DepartamentsController
