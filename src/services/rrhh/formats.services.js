
const Format = require('../../models/rrhh/format.models');

class FormatService {
    static async getAll() {
        try {
            const result = await Format.findAll({
                attributes: ['id', 'name', 'content'],
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getFormatById(id) {
        try {
            const result = await Format.findOne({
                where: { id },
                attributes: ['id', 'name', 'content']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createFormat(data) {
        try {
            const result = await Format.create(data);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateFormat(data, id) {
        try {
            const result = await Format.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Format.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = FormatService;