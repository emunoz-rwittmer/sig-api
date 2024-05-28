const FormService = require('../../../services/operations/surveys/forms.services');
const CrewService = require('../../../services/catalogs/crews.services');
const CaptainService = require('../../../services/catalogs/captains.services');
const Utils = require('../../../utils/Utils');
const bcrypt = require('bcrypt');
const sendEmail = require('../../../utils/mailer');

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
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const serchCrew = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const result = await FormService.serchCrew(yachtId);
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const createForm = async (req, res) => {
    try {
        const form = req.body;
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
        const formId = Utils.decode(req.params.form_id);
        const form = req.body;
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
        data.formId = Utils.decode(req.body.formId);
        data.yachtId = Utils.decode(req.body.yachtId);
        const form = await FormService.getFormById(data.formId);
        const crews = await CrewService.getCrewsById(form.people !== "Tripulación" ? data.evaluator : data.evaluated)
        const captains = await CaptainService.getCaptainsById(form.people !== "Capitanes" ? data.evaluator : data.evaluated)
        if (form.people === "Tripulación") {
            data.evaluator = captains
            data.evaluated = crews;
            data.evaluatedJob = 'tripulante';
        } else if (form.people === "Capitanes") {
            data.evaluator = crews
            data.evaluated = captains;
            data.evaluatedJob = 'capitan';
        }
        const result = await FormService.createHeaderAnswer(data);
        if (result && form.people === "Tripulación") {
            const action = "tripulacion"
            for (const evaluador of captains) {
                const passwordGenerate = Utils.getPasswordRandom();
                const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);
                sendEmail(evaluador, passwordGenerate, action);
                const result = await CaptainService.updateCaptain({
                    password: passwordGenerated
                },
                    { where: { id: evaluador.id } });
            }
            res.status(200).json({ data: 'evaluation send successfully' })
        } else if (result && form.people === "Capitanes") {
            const action = "capitanes"
            for (const evaluador of crews) {
                const passwordGenerate = Utils.getPasswordRandom();
                sendEmail(evaluador, passwordGenerate, action);
                const result = await CrewService.updateCrew({
                    password: passwordGenerate
                },
                    { where: { id: evaluador.id } });
            }
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
    serchCrew,
    sendEvaluation
}
module.exports = FormController