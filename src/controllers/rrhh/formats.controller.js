const Staffervice = require('../../services/catalogs/staff.services');
const FormatService = require('../../services/rrhh/formats.services');
const { generateAndSavePDF } = require('../../services/rrhh/pdfService');
const { sendEmailNuevaSolicitud } = require('../../mails/mailer');
const Utils = require('../../utils/Utils');
const fs = require('fs');
const path = require('path');

const getAllFormats = async (req, res) => {
    try {
        const result = await FormatService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const result = await FormatService.getFormatById(formatId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createFormat = async (req, res) => {
    try {
        const data = req.body;
        const result = await FormatService.createFormat(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const data = req.body;
        delete data.id;
        await FormatService.updateFormat(
            {...data,
               companies: data.companies.map(reg => reg) 
            }, {
            where: { id: formatId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        await FormatService.delete({
            where: { id: formatId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

//DOCTOR

const getAllDoctorFormats = async (req, res) => {
    try {
        const result = await FormatService.getAllDoctorFormats();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getDoctorFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const result = await FormatService.getDoctorFormat(formatId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createDoctorFormat = async (req, res) => {
    try {
        const data = req.body;
        data.file = `/uploads/pdfs/${req.file.filename}`
        data.companies = JSON.parse(data.companies);
        const result = await FormatService.createDoctorFormat(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateDoctorFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const data = req.body;
        if (req.file) {
            data.file = `/uploads/pdfs/${req.file.filename}`
        }
        await FormatService.updateDoctorFormat(
            {...data,
               companies: JSON.parse(data.companies) 
            }, {
            where: { id: formatId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteDoctorFormat = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        await FormatService.deleteDoctorFormat({
            where: { id: formatId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

//REQUEST STAFS

const getAllFormatsByStaff = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const staffId = Utils.decode(req.params.staff_id);
        const result = await FormatService.getAllFormatsByStaff(formatId, staffId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createRequesForStaff = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const staffId = Utils.decode(req.params.staff_id);
        const file = req.file; // puede ser undefined
        const data = req.body;

        const staff = await Staffervice.getStaffById(staffId);
        const fomrat = await FormatService.getFormatById(formatId);

        const staffFullName = `${staff.dataValues.first_name}_${staff.dataValues.last_name}`.replace(/\s+/g, '_');
        const stafftDir = path.join(__dirname, '../../../uploads/staffs', staffFullName);

        if (!fs.existsSync(stafftDir)) {
            fs.mkdirSync(stafftDir, { recursive: true });
        }

        const dataMail = {
            staff: `${staff.dataValues.first_name} ${staff.dataValues.last_name}`,
            formato: fomrat.dataValues.name
        };

        const fileName = `${dataMail.formato}-${dataMail.staff}.pdf`.replace(/\s+/g, '_');
        const filePath = path.join(stafftDir, fileName);

        await generateAndSavePDF(data.contenido, filePath, data);

        const relativePath = path.relative(path.join(__dirname, '../../../'), filePath);
        const fileData = fs.readFileSync(filePath).toString('base64');

        data.name = fomrat.dataValues.name;
        data.formatId = formatId;
        data.staffId = staffId;
        data.file = relativePath;

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
            //sendEmailNuevaSolicitud(formatId, dataMail, attachments);
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
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