const RegulationService = require('../../services/rrhh/regulations.services');
const Utils = require('../../utils/Utils');
const Staffervice = require('../../services/catalogs/staff.services');
const { sendEmailConfirmacion } = require('../../mails/mailer');
const AppError = require('../../errors/AppError');

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

const getAllRegulations = async (req, res, next) => {
    try {
        const companyId = decodeId(req.params.company_id, 'company_id');
        const result = await RegulationService.getAll(companyId);
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

const getRegulationStaffById = async (req, res, next) => {
    try {
        const regulationId = decodeId(req.params.regulation_id, 'regulation_id');
        const result = await RegulationService.getRegulationStaffById(regulationId);
        if (!result) {
            throw new AppError('Registro de lectura no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getAllRegulationsBystaff = async (req, res, next) => {
    try {
        const staffId = decodeId(req.params.staff_id, 'staff_id');
        const result = await RegulationService.getAllRegulationsBystaff(staffId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.regulation.dataValues.id = Utils.encode(x.dataValues.regulation.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getAllStaffsRegulations = async (req, res, next) => {
    try {
        const companyId = decodeId(req.params.company_id, 'company_id');
        const result = await RegulationService.getAllStaffsRegulations(companyId);
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

const createRegulation = async (req, res, next) => {
    try {
        const data = req.body;
        if (!req.file) {
            throw new AppError('No se ha subido ningún archivo', 400);
        }
        data.file = `/uploads/pdfs/${req.file.filename}`
        data.companyId = decodeId(data.companyId, 'companyId')
        const result = await RegulationService.createRegulation(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateRegulation = async (req, res, next) => {
    try {
        const regulationId = decodeId(req.params.regulation_id, 'regulation_id');
        const data = req.body;
        if (data.companyId) {
            data.companyId = decodeId(data.companyId, 'companyId')
        }
        if (req.file) {
            data.file = `/uploads/pdfs/${req.file.filename}`
        }
        await RegulationService.updateRegulation(data, {
            where: { id: regulationId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteRegulation = async (req, res, next) => {
    try {
        const regulationId = decodeId(req.params.regulation_id, 'regulation_id');
        await RegulationService.delete(regulationId);
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
    }
}

const readAceptRegulation = async (req, res, next) => {
    try {
        const regulationReadId = decodeId(req.params.regulation_id, 'regulation_id');
        const result = await RegulationService.readAceptRegulation(regulationReadId);
        if (!result) {
            throw new AppError('Registro de lectura no encontrado', 404);
        }
        const staff = await Staffervice.getStaffById(result.dataValues.staffId);
        const regulation = await RegulationService.getRegulationById(result.dataValues.regulationId);
        const dataMail = {
            staff: `${staff.dataValues.firstName} ${staff.dataValues.lastName}`,
            reglamento: regulation.dataValues.name
        };
        sendEmailConfirmacion(dataMail);
        res.status(200).json({ data: 'resource updated successfully' })
    } catch (error) {
        next(error);
    }
}

const RegulationController = {
    getAllRegulations,
    getRegulationStaffById,
    getAllRegulationsBystaff,
    getAllStaffsRegulations,
    createRegulation,
    updateRegulation,
    deleteRegulation,
    readAceptRegulation
}
module.exports = RegulationController
