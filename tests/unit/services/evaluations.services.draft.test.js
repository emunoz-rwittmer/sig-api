jest.mock('../../../src/models/operations/surveys/form.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/formQuestion.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/formAnswers.models', () => ({ bulkCreate: jest.fn() }));
jest.mock('../../../src/models/operations/surveys/formRespond.models', () => ({ findOne: jest.fn(), update: jest.fn() }));
jest.mock('../../../src/models/catalogs/yacht.models', () => ({}));
jest.mock('../../../src/models/catalogs/staff.models', () => ({}));
jest.mock('../../../src/models/catalogs/departament.models', () => ({}));
jest.mock('../../../src/models/catalogs/positions.models', () => ({}));
jest.mock('../../../src/models/catalogs/company.models', () => ({}));
jest.mock('../../../src/utils/database', () => ({ transaction: jest.fn() }));

const db = require('../../../src/utils/database');
const FormAnswers = require('../../../src/models/operations/surveys/formAnswers.models');
const FormRespond = require('../../../src/models/operations/surveys/formRespond.models');
const EvaluationService = require('../../../src/services/operations/surveys/evaluations.services');

describe('EvaluationService drafts and responses', () => {
    let transaction;

    beforeEach(() => {
        jest.clearAllMocks();
        transaction = { commit: jest.fn(), rollback: jest.fn() };
        db.transaction.mockResolvedValue(transaction);
    });

    describe('saveDraft', () => {
        it('guarda respuestas y comentario en el borrador de una evaluación pendiente', async () => {
            const evaluation = { state: 'Pendiente', update: jest.fn() };
            FormRespond.findOne.mockResolvedValue(evaluation);

            await EvaluationService.saveDraft(5, { answers: { 10: '3' }, comment: 'Buen trabajo' });

            expect(evaluation.update).toHaveBeenCalledWith({ draft: { answers: { 10: '3' }, comment: 'Buen trabajo' } });
        });

        it('acepta un borrador vacío', async () => {
            const evaluation = { state: 'Pendiente', update: jest.fn() };
            FormRespond.findOne.mockResolvedValue(evaluation);

            await EvaluationService.saveDraft(5, {});

            expect(evaluation.update).toHaveBeenCalledWith({ draft: { answers: {}, comment: '' } });
        });

        it.each(['Completada', 'Caducada'])('rechaza con 400 si la evaluación está %s', async (state) => {
            FormRespond.findOne.mockResolvedValue({ state, update: jest.fn() });

            await expect(EvaluationService.saveDraft(5, { answers: {} })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('responde 404 si la evaluación no existe', async () => {
            FormRespond.findOne.mockResolvedValue(null);

            await expect(EvaluationService.saveDraft(99, { answers: {} })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('respondEvaluation', () => {
        it('crea las respuestas, completa la evaluación, guarda el comentario y descarta el borrador', async () => {
            FormRespond.findOne.mockResolvedValue({ state: 'Pendiente' });
            FormAnswers.bulkCreate.mockResolvedValue([{}]);

            await EvaluationService.respondEvaluation(5, { 10: '4', 11: 'ok' }, 'Sin observaciones');

            expect(FormAnswers.bulkCreate).toHaveBeenCalledWith(
                [
                    { respuestaId: 5, questionId: 10, answer: '4' },
                    { respuestaId: 5, questionId: 11, answer: 'ok' },
                ],
                { transaction },
            );
            expect(FormRespond.update).toHaveBeenCalledWith(
                { state: 'Completada', comment: 'Sin observaciones', draft: null },
                { where: { id: 5 }, transaction },
            );
            expect(transaction.commit).toHaveBeenCalledTimes(1);
        });

        it('guarda comentario nulo cuando viene vacío', async () => {
            FormRespond.findOne.mockResolvedValue({ state: 'Pendiente' });
            FormAnswers.bulkCreate.mockResolvedValue([{}]);

            await EvaluationService.respondEvaluation(5, { 10: '4' }, '');

            expect(FormRespond.update).toHaveBeenCalledWith(
                expect.objectContaining({ comment: null }),
                expect.any(Object),
            );
        });

        it.each(['Completada', 'Caducada'])('no vuelve a responder una evaluación %s', async (state) => {
            FormRespond.findOne.mockResolvedValue({ state });

            await expect(EvaluationService.respondEvaluation(5, { 10: '4' })).rejects.toMatchObject({ statusCode: 400 });

            expect(FormAnswers.bulkCreate).not.toHaveBeenCalled();
            expect(db.transaction).not.toHaveBeenCalled();
        });

        it('hace rollback si falla la creación de respuestas', async () => {
            FormRespond.findOne.mockResolvedValue({ state: 'Pendiente' });
            FormAnswers.bulkCreate.mockRejectedValue(new Error('db caída'));

            await expect(EvaluationService.respondEvaluation(5, { 10: '4' })).rejects.toThrow('db caída');

            expect(transaction.rollback).toHaveBeenCalledTimes(1);
            expect(transaction.commit).not.toHaveBeenCalled();
        });
    });
});
