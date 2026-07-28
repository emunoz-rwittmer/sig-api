const { Op, Sequelize } = require('sequelize');
const Yacht = require('../../../models/catalogs/yacht.models');
const ComentCardQR = require('../../../models/operations/comentCard/cardQR.models');
const ComentCardYacht = require('../../../models/operations/comentCard/cardYacht.models');
const ComentCard = require('../../../models/operations/comentCard/comentCard.models');
const ComentCardAnswers = require('../../../models/operations/comentCard/comentCardAnswers.models');
const ComentCardQuestions = require('../../../models/operations/comentCard/comentCardQuestions.models');
const ComentCardRespond = require('../../../models/operations/comentCard/comentCardRespond.models');
const db = require('../../../utils/database');

const questionPayload = (question, comentCardId) => ({
    title: question.title,
    type: question.type,
    required: Boolean(question.required),
    scaleMin: question.scaleMin ?? null,
    scaleMax: question.scaleMax ?? null,
    options: Array.isArray(question.options) ? question.options : [],
    comentCardId,
});

class ComentCardService {
    static getAll() {
        return ComentCardYacht.findAll({
            include: [
                {
                    model: ComentCard,
                    as: 'coment_card',
                },
                {
                    model: Yacht,
                    as: 'yate',
                },
            ],
        });
    }

    static getComentCardById(id) {
        return ComentCard.findOne({
            where: { id },
            attributes: ['id', 'name', 'createdAt'],
            include: [
                {
                    model: ComentCardQuestions,
                    as: 'preguntas',
                },
                {
                    model: ComentCardYacht,
                    as: 'yates',
                    attributes: ['id'],
                    include: [{
                        model: Yacht,
                        as: 'yate',
                        attributes: ['id', 'name'],
                    }],
                },
            ],
        });
    }

    static createComentCard(data) {
        return db.transaction(async (transaction) => {
            const comentCard = await ComentCard.create(
                { name: data.name },
                { transaction }
            );
            const questions = data.preguntas.map((question) =>
                questionPayload(question, comentCard.id)
            );
            if (questions.length) {
                await ComentCardQuestions.bulkCreate(questions, { transaction });
            }
            return comentCard;
        });
    }

    static updateComentCard({ preguntas = [], name, formId }) {
        return db.transaction(async (transaction) => {
            await ComentCard.update(
                { name },
                {
                    where: { id: formId },
                    transaction,
                }
            );

            await Promise.all(preguntas.map((question) => {
                const payload = questionPayload(question, formId);
                if (!question.id) {
                    return ComentCardQuestions.create(payload, { transaction });
                }
                return ComentCardQuestions.update(payload, {
                    where: {
                        id: question.id,
                        comentCardId: formId,
                    },
                    transaction,
                });
            }));
            return true;
        });
    }

    static delete(id) {
        return ComentCard.destroy({ where: { id } });
    }

    static getYachtsWithComentCard(cardId) {
        return ComentCardYacht.findAll({
            where: { cardId },
            attributes: ['id', 'createdAt'],
            include: [
                {
                    model: Yacht,
                    as: 'yate',
                    attributes: ['id', 'name'],
                },
                {
                    model: ComentCardQR,
                    as: 'links_acceso',
                    attributes: ['id'],
                },
            ],
        });
    }

    static getAllAccessLinks(comentCardYachtId) {
        return ComentCardQR.findAll({
            where: { comentCardYachtId },
            attributes: [
                'id',
                'access_link',
                'code',
                'name',
                'start_date',
                'end_date',
                'createdAt',
            ],
            include: [
                {
                    model: ComentCardRespond,
                    as: 'respuestas_coment_card',
                    include: [
                        {
                            model: ComentCardAnswers,
                            as: 'respuestas',
                            include: [
                                {
                                    model: ComentCardQuestions,
                                    as: 'pregunta',
                                },
                            ],
                        },
                    ],
                },
            ],
            order: [['start_date', 'DESC']],
        });
    }

    static async getAllComentCardsForLink(cardQrId) {
        const result = await ComentCardRespond.findAll({
            where: { cardQrId },
            attributes: [
                'id',
                'nombre_completo',
                'cabin',
                'isSubmited',
                'createdAt',
            ],
            include: [
                {
                    model: ComentCardAnswers,
                    attributes: ['answer'],
                    as: 'respuestas',
                    include: [
                        {
                            model: ComentCardQuestions,
                            attributes: ['id', 'title'],
                            as: 'pregunta',
                        },
                    ],
                },
            ],
        });

        return result.map((response) => {
            const plainResponse = response.toJSON();
            plainResponse.respuestas.sort((first, second) =>
                first.pregunta.id - second.pregunta.id
            );
            return plainResponse;
        });
    }

    static getComentCardByQr(id) {
        return ComentCardQR.findOne({
            where: { id },
            include: [
                {
                    model: ComentCardYacht,
                    as: 'card_yacht',
                    attributes: ['id'],
                    include: [{
                        model: ComentCard,
                        as: 'coment_card',
                        attributes: ['id', 'name'],
                        include: [{
                            model: ComentCardQuestions,
                            as: 'preguntas',
                            attributes: ['id', 'title', 'type', 'required', 'scaleMin', 'scaleMax', 'options'],
                        }],
                    }],
                },
            ],
        });
    }

    static getComentCardByDates(yachtId, toDay) {
        const date = new Date(toDay);
        date.setUTCHours(0, 0, 0, 0);

        return ComentCardQR.findOne({
            where: {
                [Op.and]: [
                    Sequelize.where(
                        Sequelize.literal('DATE_ADD(start_date, INTERVAL 1 DAY)'),
                        { [Op.lte]: date }
                    ),
                    { endDate: { [Op.gte]: date } },
                ],
            },
            attributes: ['accessLink', 'startDate', 'endDate'],
            include: [
                {
                    model: ComentCardYacht,
                    as: 'card_yacht',
                    attributes: ['id'],
                    where: { yachtId },
                    required: true,
                    include: [{
                        model: Yacht,
                        as: 'yate',
                        attributes: ['code'],
                    }],
                },
            ],
        });
    }

    static respondComentCard({ responsesToInsert, passenger }) {
        return db.transaction(async (transaction) => {
            const response = await ComentCardRespond.create(
                {
                    cardQrId: passenger.cardQrId,
                    fullName: passenger.name,
                    cabin: passenger.cabin,
                    readPolitics: passenger.readPolitics,
                    isSubmited: true,
                },
                { transaction }
            );

            if (responsesToInsert.length) {
                await ComentCardAnswers.bulkCreate(
                    responsesToInsert.map((answer) => ({
                        respuestaId: response.id,
                        ...answer,
                    })),
                    { transaction }
                );
            }
            return response;
        });
    }

    static getReportingByYacht(yachtId, startDate, endDate) {
        const whereYacht = yachtId ? { yachtId } : {};
        const whereDates = startDate && endDate
            ? { startDate: { [Op.between]: [new Date(startDate), new Date(endDate)] } }
            : {};

        return ComentCardRespond.findAll({
            include: [
                {
                    model: ComentCardQR,
                    as: 'coment_card',
                    where: whereDates,
                    required: true,
                    attributes: ['code', 'name', 'startDate', 'endDate'],
                    include: [
                        {
                            model: ComentCardYacht,
                            as: 'card_yacht',
                            required: true,
                            where: whereYacht,
                            include: [
                                {
                                    model: Yacht,
                                    as: 'yate',
                                    required: true,
                                    attributes: ['name'],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: ComentCardAnswers,
                    as: 'respuestas',
                    required: true,
                    attributes: ['id', 'answer'],
                    include: [
                        {
                            model: ComentCardQuestions,
                            as: 'pregunta',
                            required: true,
                            attributes: ['id', 'title'],
                        },
                    ],
                },
            ],
        });
    }
}

module.exports = ComentCardService;
