const { fn, col, Op } = require('sequelize');
const Yacht = require('../../../models/catalogs/yacht.models');
const ComentCardQR = require('../../../models/operations/comentCard/cardQR.models');
const ComentCardYacht = require('../../../models/operations/comentCard/cardYacht.models');
const ComentCard = require('../../../models/operations/comentCard/comentCard.models');
const ComentCardAnswers = require('../../../models/operations/comentCard/comentCardAnswers.models');
const ComentCardQuestions = require('../../../models/operations/comentCard/comentCardQuestions.models');
const ComentCardRespond = require('../../../models/operations/comentCard/comentCardRespond.models');
const db = require('../../../utils/database');
const Utils = require('../../../utils/Utils');
require('dotenv').config();


class ComentCardService {
    static async getAll() {
        try {
            const result = await ComentCard.findAll({
                attributes: ['id', 'name', 'createdAt'],
                include: [
                    {
                        model: ComentCardYacht,
                        as: 'yates',
                        include: [{
                            model: Yacht,
                            as: 'yate'
                        }]
                    }
                ]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getComentCardById(id) {
        try {
            const result = await ComentCard.findOne({
                where: { id },
                attributes: ['id', 'name', 'createdAt'],
                include: [
                    {
                        model: ComentCardQuestions,
                        as: 'preguntas',
                        attributes: ['id', 'text', 'puntuacion', 'type', 'opciones']
                    },
                    {
                        model: ComentCardYacht,
                        as: 'yates',
                        attributes: ['id'],
                        include: [{
                            model: Yacht,
                            as: 'yate',
                            attributes: ['id', 'name']
                        }]
                    }
                ]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createComentCard(info) {
        const { preguntas, data } = info;
        const transaction = await db.transaction();
        try {
            const result = await ComentCard.create(data, { transaction });

            if (!result) {
                throw new Error('No se pudo crear coment card');
            }

            await Promise.all(preguntas.map((pregunta) =>
                ComentCardQuestions.create({
                    comentCardId: result.id,
                    text: pregunta.text,
                    puntuacion: pregunta.puntuacion,
                    type: pregunta.type,
                    opciones: pregunta.opciones.map((opcion) => opcion)
                }, { transaction })
            ));

            await transaction.commit();
            return result;
        } catch (error) {
            console.log(error)
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async updateComentCard(info) {
        const { preguntas, data, formId } = info;
        const transaction = await db.transaction();

        try {
            const result = await ComentCard.update(
                data,
                {
                    where: { id: formId },
                    transaction,
                }
            );

            if (result[0] === 0) {
                throw new Error('No se pudo actualizar coment card');
            }

            // 👇 IMPORTANTE: map con async
            await Promise.all(
                preguntas.map(async (pregunta) => {
                    const isNew = !pregunta.id || pregunta.id === '';

                    if (isNew) {
                        await ComentCardQuestions.create({
                            comentCardId: formId,
                            text: pregunta.text,
                            puntuacion: pregunta.puntuacion,
                            type: pregunta.type,
                            opciones: pregunta.opciones.map((opcion) => opcion)
                        }, { transaction });
                    } else {
                        await ComentCardQuestions.update(
                            {
                                text: pregunta.text,
                                puntuacion: pregunta.puntuacion,
                                type: pregunta.type,
                                opciones: pregunta.opciones.map((opcion) => opcion)
                            },
                            {
                                where: { id: pregunta.id },
                                transaction,
                            }
                        );
                    }
                })
            );

            await transaction.commit();
            return result;
        } catch (error) {
            console.log(error);
            await transaction.rollback();
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await ComentCard.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // COMMENT CARD YACHT
    static async getYachtsWithComentCard(cardId) {
        try {
            const result = await ComentCardYacht.findAll({
                where: { cardId },
                attributes: ['id', 'createdAt'],
                include: [
                    {
                        model: Yacht,
                        as: 'yate',
                        attributes: ['id', 'name']
                    },
                    {
                        model: ComentCardQR,
                        as: 'links_acceso',
                        attributes: ['id']
                    },

                ]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getAllAccessLinks(comentCardYachtId) {
        try {
            const result = await ComentCardQR.findAll({
                where: { comentCardYachtId },
                attributes: [
                    'id',
                    'access_link',
                    'start_date',
                    'end_date',
                    'createdAt',
                    [fn('COUNT', col('respuestas_coment_card.id')), 'cards_count'],
                ],
                include: [
                    {
                        model: ComentCardRespond,
                        attributes: [], // No traemos las respuestas, solo las contamos
                        as: 'respuestas_coment_card',
                    },
                ],
                group: ['id'],
                order: [['start_date', 'DESC']],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getAllComentCardsForLink(cardQrId) {
        try {
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
                                attributes: ['id', 'text'],
                                as: 'pregunta',
                            },
                        ],
                    },
                ]
            });

            // Ordenar manualmente las respuestas por el id de la pregunta
            const orderedResult = result.map(respond => {
                const sortedRespuestas = [...respond.respuestas].sort((a, b) => {
                    return a.pregunta.id - b.pregunta.id;
                });
                return {
                    ...respond.toJSON(),
                    respuestas: sortedRespuestas
                };
            });
            return orderedResult;
        } catch (error) {
            throw error;
        }
    }

    static async createCardYacht(data) {
        try {
            const result = await ComentCardYacht.create(data)
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createLink(data) {
        const transaction = await db.transaction();
        try {
            const result = await ComentCardQR.create(data, { transaction });
            const id = Utils.encode(result.dataValues.id);
            const accessLink = `${process.env.URL_CAPTAINS}/coment_card/${id}`; // Cambia a tu estructura de URL
            await result.update({ accessLink: accessLink }, { transaction });
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async createManyLink(data) {
        const transaction = await db.transaction();
        try {
            const createdRecords = [];

            for (const item of data) {
                const created = await ComentCardQR.create(item, { transaction });

                const encodedId = Utils.encode(created.id);
                const accessLink = `${process.env.URL_CAPTAINS}/coment_card/${encodedId}`;

                await ComentCardQR.update(
                    { accessLink },
                    { where: { id: created.id }, transaction }
                );

                createdRecords.push({ ...created.toJSON(), accessLink });
            }

            await transaction.commit();
            return createdRecords;
        } catch (error) {
            await transaction.rollback();
            console.error("❌ Error en createManyLink:", error);
            throw error;
        }
    }


    static async deleteCardYacht(id) {
        try {
            const result = await ComentCardYacht.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getComentCardByQr(id) {
        try {
            const result = await ComentCardQR.findOne({
                where: { id },
                attributes: ['id', 'comentCardYachtId', 'startDate'],
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
                                attributes: ['id', 'text', 'puntuacion', 'type', 'opciones']
                            }]
                        }]
                    },

                ]
            });

            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async getComentCardByDates(comentCardYachtId, toDay) {
        const date = new Date(toDay);
        try {
            const result = await ComentCardQR.findOne({
                where: {
                    comentCardYachtId,
                    startDate: { [Op.lte]: date },
                    endDate: { [Op.gte]: date }
                },
                attributes: ['accessLink', 'startDate', 'endDate'],
                include: [
                    {
                        model: ComentCardYacht,
                        as: 'card_yacht',
                        attributes: ['id'],
                        include: [{
                            model: Yacht,
                            as: 'yate',
                            attributes: ['code'],
                        }]
                    },
                ]
            });
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async respondComentCard(info) {
        const { responsesToInsert, passenger } = info;
        const transaction = await db.transaction();
        try {
            const result = await ComentCardRespond.create(
                {
                    cardQrId: passenger.cometCardQr,
                    fullName: passenger.name,
                    cabin: passenger.cabin,
                    readPolitics: passenger.readPolitics,
                    isSubmited: true
                }, { transaction });

            if (!result) {
                throw new Error('No se pudo crear coment card');
            }

            await Promise.all(responsesToInsert.map((respuesta) =>
                ComentCardAnswers.create({
                    respuestaId: result.id,
                    ...respuesta
                }, { transaction })
            ));

            await transaction.commit();
            return result;
        } catch (error) {
            console.log(error)
            await transaction.rollback();
            throw new Error(error.message);
        }
    }


}

module.exports = ComentCardService;