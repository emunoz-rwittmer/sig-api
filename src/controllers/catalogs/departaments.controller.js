const DepartamentService = require('../../services/catalogs/departaments.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getDepartaments = async (req, res, next) => {
    try {
        const [result, counts] = await Promise.all([
            DepartamentService.getAll(),
            DepartamentService.getStaffAndPositionCounts(),
        ]);
        if (result instanceof Array) {
            result.map((x) => {
                const rawId = x.dataValues.id;
                x.dataValues.staffCount = counts.staffByDepartament[rawId] ?? 0;
                x.dataValues.positionsCount = counts.positionsByDepartament[rawId] ?? 0;
                x.dataValues.id = Utils.encode(rawId);
                if (x.dataValues.responsibleStaffId) {
                    x.dataValues.responsibleStaffId = Utils.encode(x.dataValues.responsibleStaffId);
                }
                if (x.dataValues.responsible) {
                    x.dataValues.responsible.dataValues.id = Utils.encode(x.dataValues.responsible.dataValues.id);
                }
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
        if (result.dataValues.responsibleStaffId) {
            result.dataValues.responsibleStaffId = Utils.encode(result.dataValues.responsibleStaffId);
        }
        if (result.dataValues.responsible) {
            result.dataValues.responsible.dataValues.id = Utils.encode(result.dataValues.responsible.dataValues.id);
        }
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
        departament.responsibleStaffId = departament.responsibleStaffId
            ? Utils.decode(departament.responsibleStaffId)
            : null;
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
        departament.responsibleStaffId = departament.responsibleStaffId
            ? Utils.decode(departament.responsibleStaffId)
            : null;
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
