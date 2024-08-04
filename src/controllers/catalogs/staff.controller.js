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
                x.dataValues.staff_departament.dataValues.id = Utils.encode(x.dataValues.staff_departament.dataValues.id);
                x.dataValues.staff_position.dataValues.id = Utils.encode(x.dataValues.staff_position.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
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
                x.dataValues.staff_departament.dataValues.id = Utils.encode(x.dataValues.staff_departament.dataValues.id);
                x.dataValues.staff_position.dataValues.id = Utils.encode(x.dataValues.staff_position.dataValues.id);

            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
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
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getEvaluatorsByFilters = async (req, res) => {
    try {
       
        const yachtId = req.query.yachtId
        const departamentId = req.query.departamentId
        const positionId = req.query.positionId
        console.log(yachtId, departamentId, positionId)
        const result = await StaffService.getEvaluatorsByFilters(yachtId, departamentId, positionId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
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
        console.log(error)
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
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getStaff = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const result = await StaffService.getStaffById(staffId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
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
        staff.departamentId = Utils.decode(req.body.departamentId);
        staff.positionId = Utils.decode(req.body.positionId);
        staff.password = passwordGenerate
        const result = await StaffService.createStaff(staff);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateStaff = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const staff = req.body;
        staff.departamentId = Utils.decode(req.body.departamentId);
        staff.positionId = Utils.decode(req.body.positionId);
        const result = await StaffService.updateStaff(staff, {
            where: { id: staffId },
        });
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
        console.log(error)
        res.status(400).json(error.message);
    }
}

// CAPITAN - YACHT

const getAllYachts = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id)
        const result = await StaffService.getAllYachts(staffId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
            result.yacht_id = Utils.encode(result.yacht_id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const assingYacht = async (req, res) => {
    try {
        const data = {};
        data.staffId = Utils.decode(req.params.staff_id)
        data.yachtId = Utils.decode(req.body.yachti_id)
        const result = await StaffService.assingYacht(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteYacht = async (req, res) => {
    try {
        const yachtId = req.params.id;
        const result = await StaffService.deleteYacht({
            where: { id: yachtId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
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
    getAllYachts,
    assingYacht,
    deleteYacht
}
module.exports = StaffController