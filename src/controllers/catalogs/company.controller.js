const CompanyService = require('../../services/catalogs/company.services');
const Utils = require('../../utils/Utils');

const getAllCompanys = async (req, res) => {
    try {
        const result = await CompanyService.getAll();
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

const getCompany = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await CompanyService.getCompanyById(companyId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createCompany = async (req, res) => {
    try {
        const company = req.body;
        company.logo = `/uploads/companies/${req.files[0].filename}`
        const result = await CompanyService.createCompany(company);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}



const updateCompany = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const company = req.body;
        if (req.files.length > 0) {
            company.logo = `/uploads/companies/${req.files[0].filename}`
        }
        const result = await CompanyService.updateCompany(company, {
            where: { id: companyId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteCompany = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await CompanyService.delete({
            where: { id: companyId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const CompanyController = {
    getAllCompanys,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany
}
module.exports = CompanyController