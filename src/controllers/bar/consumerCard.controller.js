const ConsumerCardCount = require('../../models/bar/consumerCardCount.model');
const ConsumerCardService = require('../../services/bar/consumerCard.services');
const Utils = require('../../utils/Utils');

const getConsumerCards = async (req, res) => {
    try {
        const result = await ConsumerCardService.getAll();
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

const getConsumerCard = async (req, res) => {
    try {
        const consumerCardId = Utils.decode(req.params.consumerCard_id);
        const result = await ConsumerCardService.getConsumerCardById(consumerCardId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createConsumerCard = async (req, res) => {
    try {
        const data = req.body;     
        
        if (!data.cardItems.length) throw new Error('No se han agregado items a la tarjeta de consumo');

        data.cardItems.map((item) => {
            item.id = Utils.decode(item.id);
        })

        const result = await ConsumerCardService.createConsumerCard(data);

        res.status(200).json({ data: 'resource created successfully' });

    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateConsumerCard = async (req, res) => {
    try {
        const consumerCardId = Utils.decode(req.params.consumerCard_id);
        const data = req.body;
        delete data.id
        await ConsumerCardService.updateConsumerCard(data, consumerCardId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteConsumerCard = async (req, res) => {
    try {
        const consumerCardId = Utils.decode(req.params.ConsumerCard_id);
        const result = await ConsumerCardService.delete(consumerCardId);
        res.status(200).json({ data: result })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

const ConsumerCardController = {
    getConsumerCards,
    getConsumerCard,
    createConsumerCard,
    updateConsumerCard,
    deleteConsumerCard,
}
module.exports = ConsumerCardController