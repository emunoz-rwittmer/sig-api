const Yacht = require('../../../models/catalogs/yacht.models');
const ComentCardYacht = require('../../../models/operations/comentCard/cardYacht.models');
const ComentCard = require('../../../models/operations/comentCard/comentCard.models');
const ComentCardQuestions = require('../../../models/operations/comentCard/comentCardQuestions.models');
const db = require('../../../utils/database');


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
            console.log(result.preguntas)
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

            await Promise.all(
                preguntas.map((pregunta) =>
                    ComentCardQuestions.update(
                        {
                            text: pregunta.text,
                            puntuacion: pregunta.puntuacion,
                        },
                        {
                            where: { id: pregunta.id },
                            transaction,
                        }
                    )
                )
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

    //YACHT CARD
    static async assingYachtToComentCard(cardId, yachts) {
        try {
            const result = await Promise.all(
                yachts.map((id) =>
                    ComentCardYacht.create(
                        {
                            cardId,
                            yachtId: id,
                        }    
                    )
                )
            );
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = ComentCardService;