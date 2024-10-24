const FormService = require('../../../services/operations/surveys/forms.services');
const PositionService = require('../../../services/catalogs/positions.services');
const DepartamentService = require('../../../services/catalogs/departaments.services');
const YachtService = require('../../../services/catalogs/yachts.services');
const Staffervice = require('../../../services/catalogs/staff.services');
const Utils = require('../../../utils/Utils');
const bcrypt = require('bcrypt');
const sendEmail = require('../../../utils/mailer');
const moment = require('moment');
const UserService = require('../../../services/catalogs/users.services');

const getAllForms = async (req, res) => {
    try {
        const result = await FormService.getAll();
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

const getForm = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.form_id);
        const result = await FormService.getFormById(formId);
        if (result instanceof Object) {
            result.dataValues.id = Utils.encode(result.dataValues.id);
            result.dataValues.positionId = Utils.encode(result.dataValues.positionId);

        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getFormAllNecesary = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.form_id);
        const result = {}
        const form = await FormService.getFormById(formId);
        if (form instanceof Object) {
            form.dataValues.id = Utils.encode(form.dataValues.id);
            form.dataValues.positionId = Utils.encode(form.dataValues.positionId);

        }
        const yachts = await YachtService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const positions = await PositionService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const departaments = await DepartamentService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        result.form = form
        result.yachts = yachts
        result.positions = positions
        result.departaments = departaments

        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}


const createForm = async (req, res) => {
    try {
        const positionId = Utils.decode(req.body.data.positionId)
        const form = req.body;
        form.data.positionId = positionId
        const newForm = await FormService.createForm(form.data);
        if (newForm) {
            const newEstructure = await FormService.createEstructureQuestion(newForm.id, form.preguntas)
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}



const updateForm = async (req, res) => {
    try {
        const positionId = Utils.decode(req.body.data.positionId)
        const formId = Utils.decode(req.params.form_id);
        const form = req.body;
        form.data.positionId = positionId
        const result = await FormService.updateForm(form.data, {
            where: { id: formId },
        });
        if (result) {
            const updateEstructure = await FormService.updateEstructureQuestion(form.preguntas, formId)
            res.status(200).json({ data: 'resource updated successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteForm = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.form_id);
        const result = await FormService.delete({
            where: { id: formId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const deleteQuestionForm = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.form_id);
        const questionId = req.params.question_id;
        const result = await FormService.deleteQuestionForm(formId, questionId);
        if (result) {
            res.status(200).json({ data: 'resource deleted successfully' })
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const sendEvaluation = async (req, res) => {
    try {
        const data = req.body
        const expirationDate = moment().add(2, 'days').toDate();
        data.formId = Utils.decode(req.body.formId);
        data.evaluator = data.evaluator.map(id => Utils.decode(id))
        data.evaluated = data.evaluated.map(id => Utils.decode(id))
        data.expirationDate = expirationDate;
        const result = await FormService.createHeaderAnswer(data);
        if (result instanceof Array) {
            res.status(200).json({ data: 'evaluation send successfully' })
        }

    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const sendRetroalimentation = async (req, res) => {
    try {
        const evaluadoId = Utils.decode(req.body.evaluadoId)
        const userId = Utils.decode(req.body.userId)
        const emailEvaluado = await Staffervice.getStaffById(evaluadoId)
        const emailUser = await UserService.getUserById(userId);
        if (emailEvaluado && emailUser) {
                const action = "retroalimetation"
                sendEmail(emailEvaluado, " ", action, emailUser, req.body.email);
            res.status(200).json({ data: 'evaluation send successfully' })
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const FormController = {
    getAllForms,
    getForm,
    createForm,
    updateForm,
    deleteForm,
    deleteQuestionForm,
    getFormAllNecesary,
    sendEvaluation,
    sendRetroalimentation
}
module.exports = FormController