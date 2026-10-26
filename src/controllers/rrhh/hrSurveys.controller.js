const HrSurveyService = require('../../services/rrhh/hrSurveys.services');
const { buildQuestionsTemplate, parseQuestionsWorkbook } = require('../../utils/hrSurveyQuestionsMatrix');
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

const decodeIds = (values, fieldName) => {
    if (!Array.isArray(values)) throw new AppError(`${fieldName} inválido`, 400);
    return values.map((value) => decodeId(value, fieldName));
};

// Ausente => undefined (no se toca); null o '' => null (se limpia la fecha).
const optionalDate = (value) => (value === undefined ? undefined : (value || null));

const buildSurveyPayload = (body) => ({
    name: body.name,
    description: body.description,
    startsAt: optionalDate(body.startsAt),
    endsAt: optionalDate(body.endsAt),
    active: body.active,
    positionIds: body.positionIds !== undefined ? decodeIds(body.positionIds, 'positionId') : undefined,
    questions: body.questions,
});

const toListDto = (survey) => ({
    ...survey,
    id: Utils.encode(survey.id),
    positions: survey.positions.map((entry) => ({ ...entry, id: Utils.encode(entry.id) })),
});

const toDetailDto = (survey) => {
    const data = survey.toJSON();
    return {
        ...data,
        id: Utils.encode(data.id),
        status: survey.dataValues.status,
        responded: survey.dataValues.responded,
        positions: data.positions.map((entry) => ({
            id: Utils.encode(entry.positionId),
            name: entry.position?.name ?? null,
            departament: entry.position?.departament?.name ?? null,
        })),
        questions: (data.questions ?? []).map((question) => ({
            ...question,
            id: Utils.encode(question.id),
            surveyId: undefined,
            options: (question.options ?? []).map((option) => ({
                ...option,
                id: Utils.encode(option.id),
                questionId: undefined,
                score: Number(option.score),
            })),
        })),
    };
};

// Los ids numéricos salen en hash; las claves 'none' / 'administrativo' / 'operativo' pasan tal cual.
const encodeGroupId = (id) => (/^\d+$/.test(String(id)) ? Utils.encode(Number(id)) : id);

const toDimensionDto = ({ groups, byQuestion }) => ({
    groups: groups.map((group) => ({ ...group, id: encodeGroupId(group.id) })),
    byQuestion: Object.fromEntries(
        Object.entries(byQuestion).map(([questionId, perGroup]) => [
            Utils.encode(Number(questionId)),
            Object.fromEntries(Object.entries(perGroup).map(([id, value]) => [encodeGroupId(id), value])),
        ]),
    ),
});

const toResultsDto = ({ survey, participation, questions, dimensions }) => ({
    survey: {
        id: Utils.encode(survey.id),
        name: survey.name,
        startsAt: survey.startsAt,
        endsAt: survey.endsAt,
        status: survey.status,
    },
    participation: participation.map((entry) => ({ ...entry, departamentId: Utils.encode(entry.departamentId) })),
    questions: questions.map((question) => ({
        ...question,
        questionId: Utils.encode(question.questionId),
        byDepartament: Object.fromEntries(
            Object.entries(question.byDepartament).map(([departamentId, value]) => [Utils.encode(Number(departamentId)), value]),
        ),
        distribution: question.distribution?.map((entry) => ({ ...entry, optionId: Utils.encode(entry.optionId) })),
        comments: question.comments?.map((entry) => ({ ...entry, departamentId: Utils.encode(entry.departamentId) })),
    })),
    dimensions: Object.fromEntries(Object.entries(dimensions).map(([name, dimension]) => [name, toDimensionDto(dimension)])),
});

const getAll = async (req, res, next) => {
    try {
        const result = await HrSurveyService.getAll();
        res.status(200).json(result.map(toListDto));
    } catch (error) {
        next(error);
    }
};

const getById = async (req, res, next) => {
    try {
        const surveyId = decodeId(req.params.survey_id, 'survey_id');
        const result = await HrSurveyService.getById(surveyId);
        res.status(200).json(toDetailDto(result));
    } catch (error) {
        next(error);
    }
};

const getResults = async (req, res, next) => {
    try {
        const surveyId = decodeId(req.params.survey_id, 'survey_id');
        const result = await HrSurveyService.getResults(surveyId);
        res.status(200).json(toResultsDto(result));
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const survey = await HrSurveyService.create(buildSurveyPayload(req.body));
        res.status(201).json({ data: 'resource created successfully', surveyId: Utils.encode(survey.id) });
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const surveyId = decodeId(req.params.survey_id, 'survey_id');
        await HrSurveyService.update(surveyId, buildSurveyPayload(req.body));
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        const surveyId = decodeId(req.params.survey_id, 'survey_id');
        await HrSurveyService.remove(surveyId);
        res.status(200).json({ data: 'resource deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const downloadQuestionsTemplate = async (req, res, next) => {
    try {
        const buffer = buildQuestionsTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="matriz-preguntas-encuesta.xlsx"');
        res.status(200).send(buffer);
    } catch (error) {
        next(error);
    }
};

const importQuestions = async (req, res, next) => {
    try {
        if (!req.file) throw new AppError('Adjunta un archivo de Excel (.xlsx)', 400);
        const result = parseQuestionsWorkbook(req.file.buffer);
        if (!result) throw new AppError('No se pudo leer el archivo. Usa la matriz de preguntas en formato .xlsx', 400);
        if (!result.questions.length && !result.errors.length) {
            throw new AppError('La matriz no tiene preguntas', 400);
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const HrSurveyController = {
    getAll,
    getById,
    getResults,
    create,
    update,
    remove,
    downloadQuestionsTemplate,
    importQuestions,
};

module.exports = HrSurveyController;
