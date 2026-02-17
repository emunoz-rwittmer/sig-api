const RegulationService = require('../../services/rrhh/regulations.services');
const Utils = require('../../utils/Utils');
const Staffervice = require('../../services/catalogs/staff.services');
const { sendEmailConfirmacion } = require('../../mails/mailer');

const getAllRegulations = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id)
        const result = await RegulationService.getAll(companyId);
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

const getRegulationStaffById = async (req, res) => {
    try {
        const regulationId = Utils.decode(req.params.regulation_id)
        const result = await RegulationService.getRegulationStaffById(regulationId);
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getAllRegulationsBystaff = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id)
        const result = await RegulationService.getAllRegulationsBystaff(staffId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.regulation.dataValues.id = Utils.encode(x.dataValues.regulation.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getAllStaffsRegulations = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id)
        const result = await RegulationService.getAllStaffsRegulations(companyId);
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

const getRegulation = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await RegulationService.getRegulationById(companyId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createRegulation = async (req, res) => {
    try {
        const data = req.body;
        data.file = `/uploads/pdfs/${req.file.filename}`
        data.companyId = Utils.decode(data.companyId)
        const result = await RegulationService.createRegulation(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateRegulation = async (req, res) => {
    try {
        const regulationId = Utils.decode(req.params.regulation_id);
        const data = req.body;
        data.companyId = Utils.decode(data.companyId)
        if (req.file) {
            data.file = `/uploads/pdfs/${req.file.filename}`
        }
        const result = await RegulationService.updateRegulation(data, {
            where: { id: regulationId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteRegulation = async (req, res) => {
    try {
        const regulationId = Utils.decode(req.params.company_id);
        await RegulationService.delete(regulationId);
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

const readAceptRegulation = async (req, res) => {
    try {
        const regulationId = Utils.decode(req.params.regulation_id);
        const result = await RegulationService.readAceptRegulation(regulationId);
        const staff = await Staffervice.getStaffById(result.dataValues.staffId);
        const regulation = await RegulationService.getRegulationById(result.dataValues.regulationId);
        const dataMail = {
            staff: `${staff.dataValues.first_name} ${staff.dataValues.last_name}`,
            reglamento: regulation.dataValues.name
        };
        sendEmailConfirmacion(dataMail);
        res.status(200).json({ data: 'resource updated successfully' })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const RegulationController = {
    getAllRegulations,
    getRegulationStaffById,
    getAllRegulationsBystaff,
    getAllStaffsRegulations,
    getRegulation,
    createRegulation,
    updateRegulation,
    deleteRegulation,
    readAceptRegulation
}
module.exports = RegulationController