const Consecutivo = require('../../../models/catalogs/consecutivo.model');
const ConsecutivoGuias = require('../../../models/catalogs/consecutivoGuias.model');
const CompanyService = require('../../../services/catalogs/company.services');
const GuideService = require('../../../services/operations/referralGuides/guides.services');
const { generateRemisionPDF } = require('../../../services/operations/referralGuides/pdfService');
const { sendEmailGuiaRemisionCreada } = require('../../../utils/mailer');
const Utils = require('../../../utils/Utils');
const fs = require('fs');
const path = require('path');

const getGuidesByCompany = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await GuideService.getGuidesByCompany(companyId);
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

const createGuide = async (req, res) => {
    try {
        const data = req.body;
        const companyId = Utils.decode(req.params.company_id);

        const [consecutivo] = await ConsecutivoGuias.findOrCreate({
            where: { companyId },
            defaults: { valor: 1, companyId },
        });

        const formattedCounter = `000-${consecutivo.valor.toString().padStart(3, '0')}`;
        await ConsecutivoGuias.update(
            { valor: consecutivo.valor + 1 },
            { where: { companyId } }
        );

        data.companyId = companyId;
        data.counter = formattedCounter;

        const company = await CompanyService.getCompanyById(companyId);
        const folderName = company.name.replace(/\s+/g, '_');
        const folderPath = path.join(__dirname, '../../../../uploads/pdfs/guides', folderName);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const fileName = `guia_remision_${data.counter}.pdf`;
        const filePath = path.join(folderPath, fileName);

        await generateRemisionPDF(company, data, filePath);

        const documentPath = '/' + path.relative(path.join(__dirname, '../../../../'), filePath).replace(/\\/g, '/');
        const fileData = fs.readFileSync(filePath).toString('base64');

        data.file = documentPath;

        await GuideService.createGuide(data);
        const dataMail = {
            counter: data.counter,
            company: company.name
        };
        sendEmailGuiaRemisionCreada(dataMail, fileName, fileData);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        console.log(error)
        res.status(400).json({ error: error.message });
    }
};

const updateGuide = async (req, res) => {
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
        const result = await GuideService.updateGuide(itemsUpdate);

        const newItems = items.filter(item => item.id === "");
        if (newItems.length > 0) {
            const orderId = Utils.decode(params.order_id);
            const itemsCreate = newItems.map(({ id, ...rest }) => ({
                ...rest,
                orderId: orderId
            }));
            await GuideService.createItemsOfGuide(itemsCreate);
        }

        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }

    } catch (error) {

        res.status(400).json(error.message);
    }
}


const GuideController = {

    getGuidesByCompany,
    createGuide,
    updateGuide,
    //deleteGuide,
}
module.exports = GuideController