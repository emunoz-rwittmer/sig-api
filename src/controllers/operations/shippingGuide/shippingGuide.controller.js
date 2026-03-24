const ShippingGuideCount = require('../../../models/operations/shippingGuide/shippingGuideCount.model');
const ShippingGuideService = require('../../../services/operations/shippingGuide/shippingGuide.services');
const { generateRemisionPDF } = require('../../../services/operations/shippingGuide/pdfService');
const { sendEmailGuiaRemisionCreada } = require('../../../mails/mailer');
const Utils = require('../../../utils/Utils');
const fs = require('fs');
const path = require('path');

const getShippingGuides = async (req, res) => {
    try {
        const result = await ShippingGuideService.getShippingGuides();
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

const getShippingGuideById = async (req, res) => {
    try {
        const guideId = Utils.decode(req.params.guide_id);
        const result = await ShippingGuideService.getShippingGuideById(guideId);
        result.id = Utils.encode(result.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createShippingGuide = async (req, res) => {
    try {
        const data = req.body;
        const [consecutivo] = await ShippingGuideCount.findOrCreate({
            where: {},
            defaults: { valor: 1 },
        });

        const formattedCounter = `000-${consecutivo.valor.toString().padStart(3, '0')}`;
        await ShippingGuideCount.update(
            { valor: consecutivo.valor + 1 }, { where: {} }
        );


        data.counter = formattedCounter;

        const fileName = `guia_remision_${data.counter}.pdf`;
        const filePath = path.join(__dirname, '../../../../uploads/pdfs/guides', fileName);

        await generateRemisionPDF(data, filePath);

        const documentPath = '/' + path.relative(path.join(__dirname, '../../../../'), filePath).replace(/\\/g, '/');
        const fileData = fs.readFileSync(filePath).toString('base64');

        data.file = documentPath;

        await ShippingGuideService.createShippingGuide(data);
        const dataMail = {
            counter: data.counter,
        };
        sendEmailGuiaRemisionCreada(dataMail, fileName, fileData);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
};

const updateShippingGuide = async (req, res) => {
    try {

        const { body, params } = req;

        const ids = body.id;
        const products = body.product;
        const quantitys = body.quantity;
        const originalQuantitys = body.originalQuantity;

        const items = []
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const product = products[i];
            const quantity = quantitys[i];
            const originalQuantity = originalQuantitys[i];
            const item = {
                id,
                product,
                quantity,
                originalQuantity,
            }
            items.push(item)
        }

        const itemsUpdate = items.filter(item => item.id !== "");
        const result = await ShippingGuideService.updateShippingGuide(itemsUpdate);

        const newItems = items.filter(item => item.id === "");
        if (newItems.length > 0) {
            const orderId = Utils.decode(params.order_id);
            const itemsCreate = newItems.map(({ id, ...rest }) => ({
                ...rest,
                orderId: orderId
            }));
            await ShippingGuideService.createItemsOfShippingGuide(itemsCreate);
        }

        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }

    } catch (error) {

        res.status(400).json(error.message);
    }
}


const ShippingGuideController = {

    getShippingGuides,
    getShippingGuideById,
    createShippingGuide,
    updateShippingGuide,
    //deleteShippingGuide,
}
module.exports = ShippingGuideController