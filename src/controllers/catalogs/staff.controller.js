const StaffService = require('../../services/catalogs/staff.services');
const Utils = require('../../utils/Utils');
const sendEmail = require('../../utils/mailer');
const bcrypt = require("bcrypt");

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
                    com.company.dataValues.id = Utils.encode(com.company.dataValues.id);
                })
            });
        }
        res.status(200).json(result);
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const getStaffsByFilters = async (req, res) => {
    try {
        const company = req.query.company
        const departamentId = Utils.decode(req.query.departamentId)
        const positionId = Utils.decode(req.query.positionId)
        const result = await StaffService.getStaffsByFilters(company, departamentId, positionId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.id = Utils.encode(x.dataValues.staff_departament.dataValues.id);
                x.dataValues.staff_position.dataValues.id = Utils.encode(x.dataValues.staff_position.dataValues.id);

            });
        }
        res.status(200).json(result);
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const getEvaluators = async (req, res) => {
    try {
        const search = Utils.decode(req.query.search)
        const result = await StaffService.getEvaluators(search);
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
        const search = Utils.decode(req.query.search)
        const yachtId = req.query.yachtId
        const departamentId = req.query.departamentId
        const positionId = req.query.positionId
        const result = await StaffService.getEvaluatorsByFilters(search, yachtId, departamentId, positionId);
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
        const search = Utils.decode(req.query.search)
        const result = await StaffService.getEvaluateds(search);
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
        const search = Utils.decode(req.query.search)
        const yachtId = req.query.yachtId
        const result = await StaffService.getEvaluatedsByFilters(search, yachtId);
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

const getStaff = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const result = await StaffService.getStaffById(staffId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
            if (result.roleId) result.roleId = Utils.encode(result.roleId);
            result.departamentId = Utils.encode(result.departamentId);
            result.positionId = Utils.encode(result.positionId);
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

const StaffController = {
    getAllStaffs,
    getStaffsByFilters,
    getStaff,
    getEvaluators,
    getEvaluatorsByFilters,
    getEvaluateds,
    getEvaluatedsByFilters,
    createStaff,
    updateStaff,
    deleteStaff,
}
module.exports = StaffController