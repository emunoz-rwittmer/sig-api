const Departaments = require('../../models/catalogs/departament.models');

class DepartamentService {
    static async getAll() {
        try {
            const result = await Departaments.findAll({
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  DepartamentService;