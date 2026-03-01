const FormService = require('../../../services/operations/surveys/forms.services');
const PositionService = require('../../../services/catalogs/positions.services');
const DepartamentService = require('../../../services/catalogs/departaments.services');
const YachtService = require('../../../services/catalogs/yachts.services');
const Staffervice = require('../../../services/catalogs/staff.services');
const Utils = require('../../../utils/Utils');
const { sendEmail } = require('../../../mails/mailer');
const moment = require('moment');
const UserService = require('../../../services/catalogs/users.services');
const CompanyService = require('../../../services/catalogs/company.services');

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
        }

        const companies = await CompanyService.getAll();
        if (companies instanceof Array) {
            companies.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }

        const yachts = await YachtService.getAll();
        if (yachts instanceof Array) {
            yachts.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const positions = await PositionService.getAll();
        if (positions instanceof Array) {
            positions.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const departaments = await DepartamentService.getAll();
        if (departaments instanceof Array) {
            departaments.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        result.form = form
        result.yachts = yachts
        result.companies = companies
        result.positions = positions
        result.departaments = departaments

        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}


const createForm = async (req, res) => {
    try {
        const { preguntas, data } = req.body;
        data.positionId = Utils.decode(data.positionId)
        await FormService.createForm({ preguntas, data });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateForm = async (req, res) => {
    try {

        const formId = Utils.decode(req.params.form_id);
        const { preguntas, data } = req.body;
        if (data.positionId) data.positionId = Utils.decode(req.body.positionId)
        await FormService.updateForm({ preguntas, data, formId });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteForm = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.form_id);
        await FormService.delete({
            where: { id: formId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteQuestionForm = async (req, res) => {
    try {
        const questionId = req.params.question_id;
        await FormService.deleteQuestionForm(questionId);
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const sendEvaluation = async (req, res) => {
    try {
        const data = req.body
        const now = moment();
        const periodWeek = `${now.isoWeekYear()}-W${String(now.isoWeek()).padStart(2, "0")}`;
        const expirationDate = now.add(3, 'days').toDate();
        data.formId = Utils.decode(req.body.formId);
        data.companyId = Utils.decode(req.body.companyId);
        data.evaluatorIds = data.evaluator.map(id => Utils.decode(id))
        data.evaluatedIds = data.evaluated.map(id => Utils.decode(id))
        data.expirationDate = expirationDate;
        data.periodWeek = periodWeek
        await FormService.createFormRespond(data);
        res.status(200).json({ data: 'evaluation send successfully' })
    } catch (error) {
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