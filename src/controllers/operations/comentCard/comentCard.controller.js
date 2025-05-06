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
        await ComentCardService.updateComentCard( { preguntas, data, formId });

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteComentCard = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.form_id);
        const result = await ComentCardService.delete({
            where: { id: formId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
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
}
module.exports = ComentCardController