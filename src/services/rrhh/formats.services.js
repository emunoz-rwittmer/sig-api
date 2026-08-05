
const DoctorFormat = require('../../models/rrhh/doctorFormat.models');
const Format = require('../../models/rrhh/format.models');
const RequestStaffs = require('../../models/rrhh/requestStaffs.models');

class FormatService {
    static async getAll() {
        try {
            const result = await Format.findAll({
                attributes: ['id', 'name', 'content', 'companies', 'createdAt'],
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
                attributes: ['id', 'name', 'content', 'companies', 'createdAt']
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

    //doctor format

    static async getAllDoctorFormats() {
        try {
            const result = await DoctorFormat.findAll({
                attributes: ['id', 'name', 'file', 'companies', 'createdAt'],
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getDoctorFormat(id) {
        try {
            const result = await DoctorFormat.findOne({
                where: { id },
                attributes: ['id', 'name', 'file', 'companies', 'createdAt']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createDoctorFormat(data) {
        try {
            const result = await DoctorFormat.create(data);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateDoctorFormat(data, id) {
        try {
            const result = await DoctorFormat.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async deleteDoctorFormat(id) {
        try {
            const result = await DoctorFormat.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    //request staffs

    static async getAllFormatsByStaff(formatId, staffId) {
        try {
            const result = await RequestStaffs.findAll({
                where: { formatId, staffId }
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getRequestById(requestId) {
        try {
            const result = await RequestStaffs.findOne({ where: { id: requestId } });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createRequesForStaff(data) {
        try {
            const { compania, yate, name, formatId, staffId, file } = data;
            const newData = {company: compania, yacht: yate, name, formatId, staffId, file};
            const result = await RequestStaffs.create(newData);
            return result;
        } catch (error) {
            throw error;

        }
    }

}

module.exports = FormatService;