const utils = require('excel4node/distribution/lib/utils');
const RegulationService = require('../../services/rrhh/regulations.services');
const Utils = require('../../utils/Utils');

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
        const companyId = Utils.decode(req.params.company_id);
        const company = req.body;
        if (req.files.length > 0) {
            company.logo = `/uploads/companies/${req.files[0].filename}`
        }
        const result = await RegulationService.updateRegulation(company, {
            where: { id: companyId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteRegulation = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await RegulationService.delete({
            where: { id: companyId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        
        res.status(400).json(error.message);
    }
}

const RegulationController = {
    getAllRegulations,
    getRegulation,
    createRegulation,
    updateRegulation,
    deleteRegulation
}
module.exports = RegulationController