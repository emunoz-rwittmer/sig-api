const ComentCardService = require('../../../services/operations/comentCard/comentCard.services');
const AppError = require('../../../errors/AppError');
const Utils = require('../../../utils/Utils');

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

const decodeOptionalId = (value, fieldName) => {
    if (!value || value === 'undefined' || value === 'null') {
        return undefined;
    }
    return decodeId(value, fieldName);
};

const requireValidDate = (value, fieldName) => {
    if (!value || Number.isNaN(new Date(value).getTime())) {
        throw new AppError(`${fieldName} inválida`, 400);
    }
    return value;
};

const validateQuestions = (questions) => {
    questions.forEach((question) => {
        if (
            !question ||
            typeof question.title !== 'string' ||
            !question.title.trim() ||
            typeof question.type !== 'string' ||
            !question.type.trim()
        ) {
            throw new AppError('Cada pregunta debe incluir title y type', 400);
        }
        if (question.id !== undefined && (!Number.isInteger(question.id) || question.id <= 0)) {
            throw new AppError('ID de pregunta inválido', 400);
        }
        if (question.options !== undefined && !Array.isArray(question.options)) {
            throw new AppError('options debe ser un array', 400);
        }
    });
};

const encodeInstanceField = (instance, field) => {
    if (instance?.dataValues?.[field] !== undefined) {
        instance.dataValues[field] = Utils.encode(instance.dataValues[field]);
    }
};

const getAllComentCards = async (req, res, next) => {
    try {
        const result = await ComentCardService.getAll();
        result.forEach((cardYacht) => {
            encodeInstanceField(cardYacht, 'id');
            encodeInstanceField(cardYacht, 'cardId');
            encodeInstanceField(cardYacht, 'yachtId');
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getComentCard = async (req, res, next) => {
    try {
        const formId = decodeId(req.params.card_id, 'ID de comment card');
        const result = await ComentCardService.getComentCardById(formId);
        if (!result) {
            throw new AppError('Comment card no encontrada', 404);
        }

        encodeInstanceField(result, 'id');
        result.yates.forEach((item) => encodeInstanceField(item.yate, 'id'));
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createComentCard = async (req, res, next) => {
    try {
        const { name, preguntas } = req.body;
        if (typeof name !== 'string' || !name.trim() || !Array.isArray(preguntas)) {
            throw new AppError('name y preguntas son obligatorios', 400);
        }
        validateQuestions(preguntas);

        await ComentCardService.createComentCard({ name: name.trim(), preguntas });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateComentCard = async (req, res, next) => {
    try {
        const formId = decodeId(req.params.card_id, 'ID de comment card');
        const { preguntas, name } = req.body;
        if (typeof name !== 'string' || !name.trim() || !Array.isArray(preguntas)) {
            throw new AppError('name y preguntas son obligatorios', 400);
        }
        validateQuestions(preguntas);

        const existing = await ComentCardService.getComentCardById(formId);
        if (!existing) {
            throw new AppError('Comment card no encontrada', 404);
        }
        const existingQuestionIds = new Set(existing.preguntas.map((question) => question.id));
        if (preguntas.some((question) => question.id && !existingQuestionIds.has(question.id))) {
            throw new AppError('Una pregunta no pertenece a la comment card', 400);
        }

        await ComentCardService.updateComentCard({
            preguntas,
            name: name.trim(),
            formId,
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const deleteComentCard = async (req, res, next) => {
    try {
        const formId = decodeId(req.params.card_id, 'ID de comment card');
        const deleted = await ComentCardService.delete(formId);
        if (!deleted) {
            throw new AppError('Comment card no encontrada', 404);
        }
        res.status(200).json({ data: 'resource deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const getYachtsWithComentCard = async (req, res, next) => {
    try {
        const cardId = decodeId(req.params.card_id, 'ID de comment card');
        const result = await ComentCardService.getYachtsWithComentCard(cardId);
        result.forEach((cardYacht) => {
            encodeInstanceField(cardYacht, 'id');
            encodeInstanceField(cardYacht.yate, 'id');
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getAllAccessLinks = async (req, res, next) => {
    try {
        const cardYachtId = decodeId(req.params.card_yacht_id, 'ID de relación comment card/yate');
        const result = await ComentCardService.getAllAccessLinks(cardYachtId);
        result.forEach((accessLink) => encodeInstanceField(accessLink, 'id'));
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getAllComentCardsForLink = async (req, res, next) => {
    try {
        const cardQrId = decodeId(req.params.link_id, 'ID de link');
        const result = await ComentCardService.getAllComentCardsForLink(cardQrId);
        result.forEach((response) => {
            response.id = Utils.encode(response.id);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getComentCardByQr = async (req, res, next) => {
    try {
        const qrId = decodeId(req.params.comet_card_qr, 'ID de QR');
        const result = await ComentCardService.getComentCardByQr(qrId);
        if (!result) {
            throw new AppError('Link de comment card no encontrado', 404);
        }
        encodeInstanceField(result, 'id');
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getComentCardByDates = async (req, res, next) => {
    try {
        const yachtId = decodeId(req.params.yacht_id, 'ID de yate');
        const toDay = requireValidDate(req.query.toDay, 'Fecha');
        const result = await ComentCardService.getComentCardByDates(yachtId, toDay);
        if (!result) {
            throw new AppError('Link de comment card no encontrado para la fecha indicada', 404);
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const respondComentCard = async (req, res, next) => {
    try {
        const cardQrId = decodeId(req.params.comet_card_qr, 'ID de QR');
        const { answers, cabin, name, readPolitics } = req.body;
        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
            throw new AppError('answers debe ser un objeto', 400);
        }
        if (typeof name !== 'string' || !name.trim() || cabin === undefined || cabin === null) {
            throw new AppError('name y cabin son obligatorios', 400);
        }

        const accessLink = await ComentCardService.getComentCardByQr(cardQrId);
        if (!accessLink) {
            throw new AppError('Link de comment card no encontrado', 404);
        }

        const responsesToInsert = Object.entries(answers)
            .filter(([, answer]) => answer !== null && answer !== undefined)
            .map(([questionId, answer]) => {
                const parsedQuestionId = Number(questionId);
                if (!Number.isInteger(parsedQuestionId) || parsedQuestionId <= 0) {
                    throw new AppError('ID de pregunta inválido', 400);
                }
                return { questionId: parsedQuestionId, answer };
            });
        const allowedQuestionIds = new Set(
            accessLink.card_yacht.coment_card.preguntas.map((question) => question.id)
        );
        if (responsesToInsert.some(({ questionId }) => !allowedQuestionIds.has(questionId))) {
            throw new AppError('Una pregunta no pertenece a la comment card', 400);
        }

        await ComentCardService.respondComentCard({
            responsesToInsert,
            passenger: {
                name: name.trim(),
                cabin,
                readPolitics,
                cardQrId,
            },
        });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const getReportingByYacht = async (req, res, next) => {
    try {
        const yachtId = decodeOptionalId(req.params.yacht_id, 'ID de yate');
        const { startDate, endDate } = req.query;
        const hasStartDate = Boolean(startDate && startDate !== 'undefined' && startDate !== 'null');
        const hasEndDate = Boolean(endDate && endDate !== 'undefined' && endDate !== 'null');

        if (hasStartDate !== hasEndDate) {
            throw new AppError('startDate y endDate deben enviarse juntos', 400);
        }
        if (hasStartDate) {
            requireValidDate(startDate, 'startDate');
            requireValidDate(endDate, 'endDate');
        }

        const result = await ComentCardService.getReportingByYacht(
            yachtId,
            hasStartDate ? startDate : undefined,
            hasEndDate ? endDate : undefined
        );
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllComentCards,
    getComentCard,
    createComentCard,
    updateComentCard,
    deleteComentCard,
    getYachtsWithComentCard,
    getAllAccessLinks,
    getAllComentCardsForLink,
    getComentCardByQr,
    getComentCardByDates,
    getReportingByYacht,
    respondComentCard,
};
