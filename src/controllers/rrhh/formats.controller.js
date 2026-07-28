const Staffervice = require('../../services/catalogs/staff.services');
const FormatService = require('../../services/rrhh/formats.services');
const { generateAndSavePDF } = require('../../services/rrhh/pdfService');
const { sendEmailNuevaSolicitud } = require('../../mails/mailer');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');
const fs = require('fs');
const path = require('path');
const CompanyService = require('../../services/catalogs/company.services');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const parseCompanies = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        throw new AppError('companies inválido', 400);
    }
};

const getAllFormats = async (req, res, next) => {
    try {
        const result = await FormatService.getAll();
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

const getFormat = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        const result = await FormatService.getFormatById(formatId);
        if (!result) {
            throw new AppError('Formato no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createFormat = async (req, res, next) => {
    try {
        const data = req.body;
        const result = await FormatService.createFormat(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateFormat = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        const data = req.body;
        delete data.id;
        await FormatService.updateFormat(data, {
            where: { id: formatId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteFormat = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        await FormatService.delete({
            where: { id: formatId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
    }
}

//DOCTOR

const getAllDoctorFormats = async (req, res, next) => {
    try {
        const result = await FormatService.getAllDoctorFormats();
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

const getDoctorFormat = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        const result = await FormatService.getDoctorFormat(formatId);
        if (!result) {
            throw new AppError('Formato médico no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createDoctorFormat = async (req, res, next) => {
    try {
        const data = req.body;
        if (!req.file) {
            throw new AppError('No se ha subido ningún archivo', 400);
        }
        data.file = `/uploads/pdfs/${req.file.filename}`
        data.companies = parseCompanies(data.companies);
        const result = await FormatService.createDoctorFormat(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateDoctorFormat = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        const data = req.body;
        if (req.file) {
            data.file = `/uploads/pdfs/${req.file.filename}`
        }
        await FormatService.updateDoctorFormat(
            {
                ...data,
                companies: parseCompanies(data.companies)
            }, {
            where: { id: formatId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteDoctorFormat = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        await FormatService.deleteDoctorFormat({
            where: { id: formatId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
    }
}

//REQUEST STAFS

const getAllFormatsByStaff = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        const staffId = decodeId(req.params.staff_id, 'staff_id');
        const result = await FormatService.getAllFormatsByStaff(formatId, staffId);
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

const createRequesForStaff = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        const staffId = decodeId(req.params.staff_id, 'staff_id');
        const file = req.file; // puede ser undefined
        const data = req.body;

        const staff = await Staffervice.getStaffById(staffId);
        if (!staff) {
            throw new AppError('Staff no encontrado', 404);
        }

        const fomrat = await FormatService.getFormatById(formatId);
        if (!fomrat) {
            throw new AppError('Formato no encontrado', 404);
        }

        const compania = await CompanyService.getCompanyByName(data.compania)
        if (!compania) {
            throw new AppError('Compañía no encontrada', 404);
        }

        const staffSignature = staff.signature;
        const staffFullName = `${staff.dataValues.firstName}_${staff.dataValues.lastName}`.replace(/\s+/g, '_');
        const stafftDir = path.join(__dirname, '../../../uploads/staffs', staffFullName);

        if (!fs.existsSync(stafftDir)) {
            fs.mkdirSync(stafftDir, { recursive: true });
        }

        const dataMail = {
            staff: `${staff.dataValues.firstName} ${staff.dataValues.lastName}`,
            formato: fomrat.dataValues.name
        };

        const fileName = `${dataMail.formato}-${dataMail.staff}-${Date.now()}.pdf`.replace(/\s+/g, '_');
        const filePath = path.join(stafftDir, fileName);

        await generateAndSavePDF(data.contenido, filePath, data, staffSignature, compania);

        const relativePath = path.relative(path.join(__dirname, '../../../'), filePath);
        const fileData = fs.readFileSync(filePath).toString('base64');

        data.name = fomrat.dataValues.name;
        data.formatId = formatId;
        data.staffId = staffId;
        data.file = `/${relativePath}`;

        const attachments = [
            {
                content: fileData, // contenido en base64
                filename: fileName,
                type: 'application/pdf',
                disposition: 'attachment',
            },
        ]

        if (file) {
            const fileBase64 = file.buffer.toString('base64');
            attachments.push({
                content: fileBase64,
                filename: file.originalname,
                disposition: 'attachment',
                type: file.mimetype,
            });
        }

        const result = await FormatService.createRequesForStaff(data);
        if (result) {
            sendEmailNuevaSolicitud(formatId, dataMail, attachments, compania?.yacht?.email);
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}



const FormatController = {
    getAllFormats,
    getFormat,
    createFormat,
    updateFormat,
    deleteFormat,
    getAllDoctorFormats,
    getDoctorFormat,
    createDoctorFormat,
    updateDoctorFormat,
    deleteDoctorFormat,
    getAllFormatsByStaff,
    createRequesForStaff

}
module.exports = FormatController
