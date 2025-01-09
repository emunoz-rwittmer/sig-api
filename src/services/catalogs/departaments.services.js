const Departaments = require('../../models/catalogs/departament.models');
const Process = require('../../models/operations/indicators/process.models');

class DepartamentService {
    static async getAll() {
        try {
            const result = await Departaments.findAll({
                attributes: ['id','name','indicators'],
                order:[['name', 'ASC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getDepartamentById(id) {
        try {
            const result = await Departaments.findOne({
                where: { id },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getProcessById(id) {
        try {
            const result = await Process.findOne({
                where: { id },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getDepartamentsById(arrayIds) {
        try {
            const result = await Departaments.findAll({
                where: { id: {
                    [Op.in]: arrayIds
                } },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createDepartament(departament) {
        try {
            const result = await Departaments.create(departament);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateDepartament(departament, id) {
        try {
            const result = await Departaments.update(departament, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(departamentId) {
        try {
            const result = await Departaments.destroy({
                where: { id: departamentId }
            });
            if(result){
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  DepartamentService;