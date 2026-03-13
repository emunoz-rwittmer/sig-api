const Departaments = require('../../../models/catalogs/departament.models');
const Process = require('../../../models/operations/indicators/process.models');

class ProcessService {
    static async getAll() {
        try {
            const result = await Process.findAll({
                attributes: ['id', 'name', 'departamentId', 'createdAt'],
                include: [
                    {
                        model: Departaments,
                        as: 'departamento',
                        attributes: ['name'],
                    },
                ]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getProcesById(id) {
        try {
            const result = await Process.findOne({
                where: { id },
                 attributes: ['id', 'name', 'departamentId', 'createdAt'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createProces(data) {
        try {
            const result = await Process.create(data);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateProces(data, id) {
        try {
            const result = await Process.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Process.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ProcessService;