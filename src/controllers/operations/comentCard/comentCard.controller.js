const { re } = require('mathjs');
const ComentCardService = require('../../../services/operations/comentCard/comentCard.services');
const Utils = require('../../../utils/Utils');

const getAllComentCards = async (req, res) => {
    try {
        const result = await ComentCardService.getAll();
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

const getComentCard = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.card_id);
        const result = await ComentCardService.getComentCardById(formId);
        if (result instanceof Object) {
            result.dataValues.id = Utils.encode(result.dataValues.id);
            result.dataValues.yates.map(item => (
                item.yate.dataValues.id = Utils.encode(item.yate.dataValues.id)
            ))
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createComentCard = async (req, res) => {
    try {
        const { preguntas, data } = req.body;
        await ComentCardService.createComentCard({ preguntas, data });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}



const updateComentCard = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.card_id);
        const { preguntas, data } = req.body;
        await ComentCardService.updateComentCard({ preguntas, data, formId });

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteComentCard = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.card_id);
        const result = await ComentCardService.delete({
            where: { id: formId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

// YACHT COMMENT CARD

const getYachtsWithComentCard = async (req, res) => {
    try {
        const result = await ComentCardService.getYachtsWithComentCard();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.yate.dataValues.id = Utils.encode(x.dataValues.yate.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getAllAccessLinks = async (req, res) => {
    try {
        const cardyachtId = Utils.decode(req.params.card_yacht_id);
        const result = await ComentCardService.getAllAccessLinks(cardyachtId);
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

const getAllComentCardsForLink = async (req, res) => {
    try {
        const cardQrId = Utils.decode(req.params.link_id);
        const result = await ComentCardService.getAllComentCardsForLink(cardQrId);
        if (result instanceof Array) {
            result.map((x) => {
                x.id = Utils.encode(x.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createCardYacht = async (req, res) => {
    try {
        const cardId = Utils.decode(req.params.card_id);
        const yachtId = Utils.decode(req.body.yacht_id);

        await ComentCardService.createCardYacht({ cardId, yachtId });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const createLink = async (req, res) => {
    try {
        const data = req.body
        data.comentCardYachtId = Utils.decode(req.body.comentCardYachtId);
        await ComentCardService.createLink(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteCardYacht = async (req, res) => {
    try {
        const id = Utils.decode(req.params.card_id);
        await ComentCardService.deleteCardYacht({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        res.status(400).json(error.message);
    }
}


//public access link
const getComentCardByQr = async (req, res) => {
    try {
        const qr = Utils.decode(req.params.comet_card_qr);
        const result = await ComentCardService.getComentCardByQr(qr);
        if (result instanceof Object) {
            result.dataValues.id = Utils.encode(result.dataValues.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const respondComentCard = async (req, res) => {
    try {
        const cometCardQr = Utils.decode(req.params.comet_card_qr);
        const { answers, cabin, name } = req.body;
        const passenger = { name, cabin, cometCardQr };
        const responsesToInsert = answers
            .map((answer, index) => {
                if (answer !== null && answer !== undefined && answer !== '') {
                    return {
                        questionId: index,
                        answer,
                    };
                }
                return null;
            })
            .filter(Boolean); // elimina los nulls

         await ComentCardService.respondComentCard({ responsesToInsert, passenger });
         res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}



const ComentCardController = {
    getAllComentCards,
    getComentCard,
    createComentCard,
    updateComentCard,
    deleteComentCard,
    getYachtsWithComentCard,
    getAllAccessLinks,
    getAllComentCardsForLink,
    createCardYacht,
    createLink,
    deleteCardYacht,
    getComentCardByQr,
    respondComentCard
}
module.exports = ComentCardController