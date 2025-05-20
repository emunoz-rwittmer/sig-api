const Yacht = require('../../../models/catalogs/yacht.models');
const ComentCardQR = require('../../../models/operations/comentCard/cardQR.models');
const ComentCardYacht = require('../../../models/operations/comentCard/cardYacht.models');
const ComentCard = require('../../../models/operations/comentCard/comentCard.models');
const ComentCardQuestions = require('../../../models/operations/comentCard/comentCardQuestions.models');
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
                        attributes: ['id', 'text', 'puntuacion']
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
                    puntuacion: pregunta.puntuacion
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
                            puntuacion: pregunta.puntuacion
                        }, { transaction });
                    } else {
                        await ComentCardQuestions.update(
                            {
                                text: pregunta.text,
                                puntuacion: pregunta.puntuacion,
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
    static async getYachtsWithComentCard() {
        try {
            const result = await ComentCardYacht.findAll({
                attributes: ['id', 'createdAt'],
                include: [
                    {
                        model: Yacht,
                        as: 'yate',
                        attributes: ['id', 'name']
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
                attributes: ['id', 'access_link', 'start_date', 'createdAt'],
                // include: [
                //     {
                //         model: ComentCard,
                //         as: 'coment_card',
                //         attributes: ['id', 'name']
                //     },
                // ],
                order: [['start_date', 'DESC']]
            });
            console.log(result)
            return result;
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

    static async deleteCardYacht(id) {
        try {
            const result = await ComentCardYacht.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getComentCardByYachtId(yachtId) {
        try {
            const result = await ComentCardYacht.findOne({
                where: { yachtId },
                attributes: ['id', 'createdAt'],
                include: [
                    {
                        model: Yacht,
                        as: 'yate',
                        attributes: ['id', 'name']
                    },
                    {
                        model: ComentCard,
                        as: 'coment_card',
                        attributes: ['id', 'name'],
                        include: [{
                            model: ComentCardQuestions,
                            as: 'preguntas',
                            attributes: ['id', 'text', 'puntuacion']
                        }]
                    }
                ]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }


}

module.exports = ComentCardService;