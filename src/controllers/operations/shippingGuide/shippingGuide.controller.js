const ShippingGuideCount = require('../../../models/operations/shippingGuide/shippingGuideCount.model');
const ShippingGuideService = require('../../../services/operations/shippingGuide/shippingGuide.services');
const { generateRemisionPDF } = require('../../../services/operations/shippingGuide/pdfService');
const { sendEmailGuiaRemisionCreada } = require('../../../mails/mailer');
const Utils = require('../../../utils/Utils');
const AppError = require('../../../errors/AppError');
const fs = require('fs');
const path = require('path');

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

const getShippingGuides = async (req, res, next) => {
    try {
        const result = await ShippingGuideService.getShippingGuides();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getShippingGuideById = async (req, res, next) => {
    try {
        const guideId = decodeId(req.params.guide_id, 'guide_id');
        const result = await ShippingGuideService.getShippingGuideById(guideId);
        if (!result) {
            throw new AppError('Guía no encontrada', 404);
        }
        result.id = Utils.encode(result.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createShippingGuide = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.dateStartTraslate) {
            throw new AppError('dateStartTraslate es requerido', 400);
        }
        if (!data.dateEndTraslate) {
            throw new AppError('dateEndTraslate es requerido', 400);
        }
        if (!Array.isArray(data.details) || data.details.length === 0) {
            throw new AppError('details debe tener al menos un item', 400);
        }

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
        next(error);
    }
};

const updateShippingGuide = async (req, res, next) => {
    try {
        const guideId = decodeId(req.params.guide_id, 'guide_id');
        const existing = await ShippingGuideService.getShippingGuideById(guideId);
        if (!existing) {
            throw new AppError('Guía no encontrada', 404);
        }

        const { body } = req;

        const ids = body.id;
        const products = body.product;
        const quantitys = body.quantity;

        if (!Array.isArray(ids)) {
            throw new AppError('id debe ser un arreglo', 400);
        }
        if (!Array.isArray(products) || products.length !== ids.length) {
            throw new AppError('product debe ser un arreglo del mismo tamaño que id', 400);
        }
        if (!Array.isArray(quantitys) || quantitys.length !== ids.length) {
            throw new AppError('quantity debe ser un arreglo del mismo tamaño que id', 400);
        }

        const items = []
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const detail = products[i];
            const quantity = quantitys[i];
            const item = {
                id,
                detail,
                quantity,
            }
            items.push(item)
        }

        const itemsUpdate = items.filter(item => item.id !== "");
        const result = await ShippingGuideService.updateShippingGuide(itemsUpdate, guideId);

        const newItems = items.filter(item => item.id === "");
        if (newItems.length > 0) {
            const itemsCreate = newItems.map(({ id, ...rest }) => ({
                ...rest,
                guideId: guideId
            }));
            await ShippingGuideService.createItemsOfShippingGuide(itemsCreate);
        }

        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }

    } catch (error) {

        next(error);
    }
}


const deleteShippingGuide = async (req, res, next) => {
    try {
        const guideId = decodeId(req.params.guide_id, 'guide_id');
        const result = await ShippingGuideService.deleteShippingGuide(guideId);
        res.status(200).json({ data: result });
    } catch (error) {
        next(error);
    }
};


const ShippingGuideController = {

    getShippingGuides,
    getShippingGuideById,
    createShippingGuide,
    updateShippingGuide,
    deleteShippingGuide,
}
module.exports = ShippingGuideController