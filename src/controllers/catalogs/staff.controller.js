const StaffService = require('../../services/catalogs/staff.services');
const Utils = require('../../utils/Utils');
const fs = require('fs');
const path = require('path');

const getAllStaffs = async (req, res) => {
    try {
        const result = await StaffService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.departamentId = Utils.encode(x.dataValues.departamentId);
                x.dataValues.positionId = Utils.encode(x.dataValues.positionId);
                x.dataValues.roleId = Utils.encode(x.dataValues.roleId);
                x.dataValues.companies.map(com => {
                    com.dataValues.companyId = Utils.encode(com.dataValues.companyId);
                })
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)

        res.status(400).json(error.message)
    }
}

const getStaff = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const result = await StaffService.getStaffById(staffId);
        if (result instanceof Object) {
            result.dataValues.id = Utils.encode(result.dataValues.id);
            if (result.dataValues.roleId) result.dataValues.roleId = Utils.encode(result.dataValues.roleId);
            result.dataValues.departamentId = Utils.encode(result.dataValues.departamentId);
            result.dataValues.positionId = Utils.encode(result.dataValues.positionId);
            result.companies = result.companies.map(x => (
                x.dataValues.companyId = Utils.encode(x.dataValues.companyId)
            ))
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getStaffCompanies = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const result = await StaffService.getStaffCompanies(staffId);
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

const createStaff = async (req, res) => {
    try {
        const staff = req.body;
        const passwordGenerate = Utils.getPasswordRandom();
        staff.roleId = staff.roleId ? Utils.decode(staff.roleId) : null;
        staff.departamentId = Utils.decode(req.body.departamentId);
        staff.positionId = Utils.decode(req.body.positionId);
        if (staff.companyId?.length) staff.companyId = staff.companyId.map(x => Utils.decode(x));
        staff.password = passwordGenerate
        await StaffService.createStaff(staff);
        res.status(200).json({ data: 'resource created successfully' });

    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateStaff = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const staff = req.body;
        staff.id = staffId;
        staff.roleId = staff.roleId ? Utils.decode(staff.roleId) : null;
        staff.departamentId = Utils.decode(req.body.departamentId);
        staff.positionId = Utils.decode(req.body.positionId);
        if (staff.companyId?.length) staff.companyId = staff.companyId.map(x => Utils.decode(x));
        await StaffService.updateStaff(staff, staffId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteStaff = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const result = await StaffService.delete(staffId);
        res.status(200).json({ data: result })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

const getEvaluators = async (req, res) => {
    try {
        const { search } = req.query;
        const searchArray = search
            ? search.split(',')
            : [];

        const decodedArray = searchArray.map(item =>
            Utils.decode(item)
        );

        const result = await StaffService.getEvaluators(decodedArray);
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

const getEvaluatorsByFilters = async (req, res) => {
    try {
        const { search } = req.query;
        const searchArray = search
            ? search.split(',')
            : [];

        const decodedArray = searchArray.map(item =>
            Utils.decode(item)
        );
        const companyId = Utils.decode(req.query.companyId) || null;
        const departamentId = req.query.departamentId
        const positionId = Utils.decode(req.query.positionId);

        const result = await StaffService.getEvaluatorsByFilters(decodedArray, companyId, departamentId, positionId);
        result.map((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
        });
        res.status(200).json(result);
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const getEvaluateds = async (req, res) => {
    try {
        const { search } = req.query;
        const searchArray = search
            ? search.split(',')
            : [];

        const decodedArray = searchArray.map(item =>
            Utils.decode(item)
        );

        const result = await StaffService.getEvaluateds(decodedArray);
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

const getEvaluatedsByFilters = async (req, res) => {
    try {
        const { search } = req.query;
        const searchArray = search
            ? search.split(',')
            : [];

        const decodedArray = searchArray.map(item =>
            Utils.decode(item)
        );

        const companyId = Utils.decode(req.query.companyId) || null;
        const result = await StaffService.getEvaluatedsByFilters(decodedArray, companyId);
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

const uploadImage = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No se ha subido ningún archivo' });
        }

        const staff = await StaffService.getStaffById(staffId);
        const staffFullName = `${staff.dataValues.firstName}_${staff.dataValues.lastName}`.replace(/\s+/g, '_');
        const staffDir = path.join(__dirname, '../../../uploads/staffs', staffFullName);

        if (!fs.existsSync(staffDir)) {
            fs.mkdirSync(staffDir, { recursive: true });
        }

        const { type } = req.body;
        if (!type) {
            return res.status(400).json({ message: 'El campo "type" es requerido' });
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `${type}-${Date.now()}${fileExtension}`.replace(/\s+/g, '_');
        const newFilePath = path.join(staffDir, fileName);

        if (file.path && file.path !== newFilePath) {
            fs.renameSync(file.path, newFilePath);
        }

        const relativePath = path.relative(path.join(__dirname, '../../../'), newFilePath).replace(/\\/g, '/');
        const dataToUpdate = {
            [type]: `/${relativePath}`
        };

        await StaffService.uploadImage(dataToUpdate, staffId);

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        console.error('Error en uploadImage:', error);
        res.status(400).json({ message: error.message });
    }
}

const uploadStaffDocumentation = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const document = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No se ha subido ningún archivo' });
        }

        const staff = await StaffService.getStaffById(staffId);
        const staffFullName = `${staff.dataValues.firstName}_${staff.dataValues.lastName}`
            .replace(/\s+/g, '_');

        const staffDir = path.join(__dirname, '../../../uploads/staffs', staffFullName, 'documentation');

        if (!fs.existsSync(staffDir)) {
            fs.mkdirSync(staffDir, { recursive: true });
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `documentation-${Date.now()}-${document.id}${fileExtension}`
            .replace(/\s+/g, '_');

        const newFilePath = path.join(staffDir, fileName);

        if (file.path && file.path !== newFilePath) {
            fs.renameSync(file.path, newFilePath);
        }

        const relativePath = path
            .relative(path.join(__dirname, '../../../'), newFilePath)
            .replace(/\\/g, '/');

        document.file = `/${relativePath}`;
        document.fileName = file.originalname;
        document.fileSize = file.size;

        await StaffService.uploadStaffDocumentation(document);

        res.status(200).json({ data: 'Documentación guardada exitosamente' });

    } catch (error) {
        console.error('Error en uploadStaffDocumentation:', error);
        res.status(400).json({ message: error.message });
    }
};

const StaffController = {
    getAllStaffs,
    getStaff,
    getStaffCompanies,
    getEvaluators,
    getEvaluatorsByFilters,
    getEvaluateds,
    getEvaluatedsByFilters,
    createStaff,
    updateStaff,
    deleteStaff,
    uploadImage,
    uploadStaffDocumentation
}
module.exports = StaffController