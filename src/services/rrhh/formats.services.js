
const DoctorFormat = require('../../models/rrhh/doctorFormat.models');
const Format = require('../../models/rrhh/format.models');
const RequestStaffs = require('../../models/rrhh/requestStaffs.models');
const AppError = require('../../errors/AppError');

const REQUEST_STATUSES = ['revision', 'aprobada', 'rechazada'];
const RESPONSE_STATUSES = ['aprobada', 'rechazada'];

const formatRequestCode = (id) => `SOL-${String(id).padStart(4, '0')}`;

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

    static async getAllRequestsByStaff(staffId) {
        return RequestStaffs.findAll({
            where: { staffId },
            attributes: ['id', 'formatId', 'name', 'company', 'file', 'status', 'respondedAt', 'createdAt'],
            order: [['createdAt', 'ASC']],
        });
    }

    /** Todas las solicitudes de un colaborador (vista de RR. HH.), con el nombre del formato. */
    static async getAllRequestsByStaffWithFormat(staffId) {
        const requests = await RequestStaffs.findAll({
            where: { staffId },
            attributes: ['id', 'formatId', 'name', 'company', 'yacht', 'file', 'status', 'respondedAt', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });
        const formatIds = [...new Set(requests.map((request) => request.formatId))];
        const formats = formatIds.length
            ? await Format.findAll({ where: { id: formatIds }, attributes: ['id', 'name'] })
            : [];
        const nameById = new Map(formats.map((format) => [format.id, format.name]));
        requests.forEach((request) => {
            request.dataValues.formatName = nameById.get(request.formatId) ?? request.name;
        });
        return requests;
    }

    static async respondRequest(requestId, status) {
        if (!RESPONSE_STATUSES.includes(status)) {
            throw new AppError('status inválido: use aprobada o rechazada', 400);
        }
        const request = await RequestStaffs.findOne({ where: { id: requestId } });
        if (!request) {
            throw new AppError('Solicitud no encontrada', 404);
        }
        await request.update({ status, respondedAt: new Date() });
        return request;
    }

    static async getRequestById(requestId) {
        return RequestStaffs.findOne({ where: { id: requestId } });
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

FormatService.REQUEST_STATUSES = REQUEST_STATUSES;
FormatService.formatRequestCode = formatRequestCode;

module.exports = FormatService;