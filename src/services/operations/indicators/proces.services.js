const Departaments = require('../../../models/catalogs/departament.models');
const Process = require('../../../models/operations/indicators/process.models');

class ProcessService {
    static async getAll() {
        return Process.findAll({
            attributes: ['id', 'name', 'departamentId', 'createdAt'],
            include: [
                {
                    model: Departaments,
                    as: 'departamento',
                    attributes: ['id', 'name'],
                },
            ]
        });
    }

    static async getProcesById(id) {
        return Process.findOne({
            where: { id },
            attributes: ['id', 'name', 'departamentId', 'createdAt'],
        });
    }

    static async createProces(data) {
        return Process.create(data);
    }

    static async updateProces(data, id) {
        return Process.update(data, id);
    }

    static async delete(id) {
        return Process.destroy(id);
    }
}

module.exports = ProcessService;
