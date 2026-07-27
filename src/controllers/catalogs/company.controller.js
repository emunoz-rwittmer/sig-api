const CompanyService = require('../../services/catalogs/company.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getAllCompanys = async (req, res, next) => {
    try {
        const result = await CompanyService.getAll();
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

const getCompany = async (req, res, next) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await CompanyService.getCompanyById(companyId);
        if (!result) {
            throw new AppError('Empresa no encontrada', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createCompany = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            throw new AppError('No se ha subido ningún archivo', 400);
        }
        const company = req.body;
        company.logo = `/uploads/companies/${req.files[0].filename}`
        const result = await CompanyService.createCompany(company);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateCompany = async (req, res, next) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const company = req.body;
        if (req.files && req.files.length > 0) {
            company.logo = `/uploads/companies/${req.files[0].filename}`
        }
        await CompanyService.updateCompany(company, {
            where: { id: companyId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteCompany = async (req, res, next) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await CompanyService.delete({
            where: { id: companyId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
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