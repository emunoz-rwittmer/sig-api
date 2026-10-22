const HrSurveyResponseService = require('../../services/rrhh/hrSurveyResponses.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

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

const isEmpty = (value) => value === undefined || value === null || value === '';

// questionId/optionId llegan en hash; value (escala) y text pasan tal cual.
// Cualquier `score` del cliente se descarta aquí.
const decodeAnswers = (answers) => {
    if (!Array.isArray(answers)) throw new AppError('answers inválido', 400);
    return answers.map((answer) => {
        if (!answer || typeof answer !== 'object') throw new AppError('answers inválido', 400);
        return {
            questionId: decodeId(answer.questionId, 'questionId'),
            optionId: isEmpty(answer.optionId) ? null : decodeId(answer.optionId, 'optionId'),
            value: answer.value,
            text: answer.text,
        };
    });
};

// Mismo patrón que inductionAttempts.controller.js: el JWT guarda el id en hash.
const currentStaffId = (req) => decodeId(req.userId, 'user');

const toSurveyDto = (survey) => ({ ...survey, id: Utils.encode(survey.id) });

const listMine = async (req, res, next) => {
    try {
        const result = await HrSurveyResponseService.listMine(currentStaffId(req));
        res.status(200).json(result.map(toSurveyDto));
    } catch (error) {
        next(error);
    }
};

const getMineDetail = async (req, res, next) => {
    try {
        const surveyId = decodeId(req.params.survey_id, 'survey_id');
        const result = await HrSurveyResponseService.getMineDetail(currentStaffId(req), surveyId);
        res.status(200).json({
            ...toSurveyDto(result),
            questions: result.questions.map((question) => ({
                ...question,
                id: Utils.encode(question.id),
                options: question.options.map((option) => ({ ...option, id: Utils.encode(option.id) })),
            })),
        });
    } catch (error) {
        next(error);
    }
};

const submit = async (req, res, next) => {
    try {
        const surveyId = decodeId(req.params.survey_id, 'survey_id');
        const answers = decodeAnswers(req.body?.answers);
        await HrSurveyResponseService.submit(currentStaffId(req), surveyId, answers);
        // Ningún id de participación/respuesta sale de aquí.
        res.status(200).json({ ok: true });
    } catch (error) {
        next(error);
    }
};

const HrSurveyResponseController = {
    listMine,
    getMineDetail,
    submit,
};

module.exports = HrSurveyResponseController;
