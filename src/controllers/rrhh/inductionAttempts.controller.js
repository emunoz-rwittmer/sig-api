const InductionAttemptService = require('../../services/rrhh/inductionAttempts.services');
const { toStaffDto } = require('../../utils/inductionPresenters');
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

const decodeAnswers = (answers) => (answers ?? []).map((answer) => ({
    questionId: decodeId(answer.questionId, 'questionId'),
    optionId: decodeId(answer.optionId, 'optionId'),
}));

// El JWT guarda el id del usuario ya codificado con hashids (mismo patrón
// que auth.controller.js al armar `userData.id` antes de firmar el token),
// así que `req.userId` se decodifica igual que cualquier id de ruta.
const currentStaffId = (req) => decodeId(req.userId, 'user');

const listMine = async (req, res, next) => {
    try {
        const result = await InductionAttemptService.listMine(currentStaffId(req));
        res.status(200).json(result.map(toStaffDto));
    } catch (error) {
        next(error);
    }
};

const getMineDetail = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        const result = await InductionAttemptService.getMineDetail(currentStaffId(req), inductionId);
        res.status(200).json(toStaffDto(result));
    } catch (error) {
        next(error);
    }
};

const markViewed = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        await InductionAttemptService.markViewed(currentStaffId(req), inductionId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const submitAttempt = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        const answers = decodeAnswers(req.body.answers);
        const result = await InductionAttemptService.submitAttempt(currentStaffId(req), inductionId, answers);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const InductionAttemptController = {
    listMine,
    getMineDetail,
    markViewed,
    submitAttempt,
};

module.exports = InductionAttemptController;
