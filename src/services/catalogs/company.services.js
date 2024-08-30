const Company = require('../../models/catalogs/company.models');

class CompanyService {
    static async getAll() {
        try {
            const result = await Company.findAll({
                attributes: ['id','name','comercialName','ruc','adress', 'logo', 'active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getCompanyById(id) {
        try {
            const result = await Company.findOne({
                where: { id },
                attributes: ['id','name','comercialName','ruc','adress', 'logo', 'active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createCompany(company) {
        try {
            const result = await Company.create(company);
            return result;
        } catch (error) {
            throw error;
         
        }
    }

    static async updateCompany(company, id) {
        try {
            const result = await Company.update(company,id);
            return result;
        } catch (error) {
            throw error;  
        }
    }

    static async delete(id) {
        try {
            const result = await Company.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  CompanyService;