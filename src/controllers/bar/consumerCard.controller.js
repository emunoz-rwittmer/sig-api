const { cos } = require('mathjs');
const fs = require('fs').promises;
const path = require('path');

const ConsumerCardCount = require('../../models/bar/consumerCardCount.model');
const ConsumerCardService = require('../../services/bar/consumerCard.services');
const CruiseService = require('../../services/bar/cruise.services');
const ProductBar = require('../../models/bar/productBar.models');
const Utils = require('../../utils/Utils');
const { sendBarConsumption, sendInvoiceEmail } = require('../../mails/mailer');
const { passengerInvoicePDF } = require('../../services/bar/passengerInvoicePDF.service');

// Constantes
const UPLOADS_BASE_PATH = path.resolve(__dirname, '../../../uploads');

const createConsumerCard = async (req, res) => {
    try {
        const data = req.body;
        data.userId = Utils.decode(data.userId);

        if (!data.cardItems.length) {
            throw new Error('No se han agregado items a la tarjeta de consumo');
        }

        data.cardItems = data.cardItems.map(item => ({
            ...item,
            id: Utils.decode(item.id)
        }));

        const result = await ConsumerCardService.createConsumerCard(data);
        if (result && result.passenger.email) {

            const productIds = data.cardItems.map(item => item.id);
            const products = await ProductBar.findAll({
                where: {
                    id: productIds
                }
            });

            const productsPlain = products.map(r => r.get({ plain: true }));
            const productMap = {};
            productsPlain.forEach(p => {
                productMap[p.id] = p;
            });

            const itemsFormatted = data.cardItems.map(item => {
                const product = productMap[item.id];
                return `${item.quantity}x ${product.name} ($${item.quantity * item.price})`;
            }).join(', ');

            const totalAmount = data.cardItems.reduce(
                (sum, item) => sum + (item.price * item.quantity),
                0
            );

            const dataMail = {
                passengerName: result.passenger.name,
                passengerEmail: result.passenger.email,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                yacht: result.passenger.cruise.yacht?.code,
                items: itemsFormatted,
                totalAmount
            };

            await sendBarConsumption(dataMail, result.passenger.email);
        }

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
};

const processVoucherFile = async (file, numberCard, voucherDir) => {
    if (!file) return null;

    try {
        await fs.mkdir(voucherDir, { recursive: true });
        const extension = file.mimetype.split('/')[1];
        const fileName = `${numberCard}.${extension}`.replace(/\s+/g, '_');
        const filePath = path.join(voucherDir, fileName);
        const relativePath = path.relative(UPLOADS_BASE_PATH, filePath);

        await fs.rename(file.path, filePath);
        return `/${path.relative(path.resolve(__dirname, '../../../'), filePath)}`;
    } catch (error) {
        throw new Error(`Error processing voucher: ${error.message}`);
    }
};

const generateInvoiceAndSendEmail = async (resultPlain, invoicePath, cruise, numberCard, folderName) => {
    const invoiceDir = path.dirname(invoicePath);

    try {
        await Promise.all([
            fs.mkdir(invoiceDir, { recursive: true }),
        ]);

        await passengerInvoicePDF(resultPlain, invoicePath);

        if (resultPlain?.passenger?.email) {
            const mailData = {
                passengerName: resultPlain.passenger.name,
                passengerEmail: resultPlain.passenger.email,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                yacht: cruise.yacht?.code,
                totalAmount: resultPlain.totalCount,
                invoicePath
            };

            sendInvoiceEmail(mailData).catch(err =>
                console.error(`Email failed for ${resultPlain.passenger.email}:`, err.message)
            );
        }
    } catch (error) {
        console.error('Invoice generation failed:', error);
        throw error;
    }
};

const updateConsumerCard = async (req, res) => {
    const startTime = Date.now();

    try {
        const { card_id } = req.params;
        const { cruiseId: encodedCruiseId, numberCard, paidAccount, ...updateData } = req.body;
        const file = req.file;

        if (!card_id || !encodedCruiseId) {
            return res.status(400).json({ error: 'Invalid card_id or cruiseId' });
        }

        const cruiseId = Utils.decode(encodedCruiseId);
        const folderName = (await CruiseService.getCruiseById(cruiseId))?.code?.replace(/\s+/g, '_');

        if (!folderName) {
            return res.status(404).json({ error: 'Cruise not found' });
        }

        const voucherDir = path.join(UPLOADS_BASE_PATH, 'cruises', folderName, 'vouchers');
        const [imageRelativePath, result] = await Promise.all([
            processVoucherFile(file, numberCard, voucherDir),
            ConsumerCardService.updateConsumerCard(
                { ...updateData, numberCard, paidAccount: true, image: null },
                card_id
            )
        ]);

        if (imageRelativePath) {
            updateData.image = imageRelativePath;
            await ConsumerCardService.updateConsumerCard({ image: imageRelativePath }, card_id);
        }

        if (paidAccount === 'null') {
            const resultPlain = result.get?.({ plain: true }) || result;
            const invoicePath = path.join(
                UPLOADS_BASE_PATH,
                'cruises',
                folderName,
                'invoices',
                `invoice_${numberCard}.pdf`
            );

            generateInvoiceAndSendEmail(resultPlain, invoicePath, await CruiseService.getCruiseById(cruiseId), numberCard, folderName)
                .catch(err => console.error('Invoice/Email process failed:', err));
        }

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

//Cortecy Card

const createCortecyCard = async (req, res) => {
    try {
        const data = req.body;
        data.userId = Utils.decode(data.userId);

        if (!data.items.length) throw new Error('No se han agregado items a la tarjeta');

        data.items.map((item) => {
            item.id = Utils.decode(item.id);
        })

        const result = await ConsumerCardService.createCortecyCard(data);

        res.status(200).json({ data: 'resource created successfully' });

    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateCortecyCard = async (req, res) => {

    try {
        const { card_id } = req.params;
        const { cruiseId: encodedCruiseId, numberCard, ...updateData } = req.body;
        const file = req.file;

        if (!card_id || !encodedCruiseId) {
            return res.status(400).json({ error: 'Invalid card_id or cruiseId' });
        }

        const cruiseId = Utils.decode(encodedCruiseId);
        const folderName = (await CruiseService.getCruiseById(cruiseId))?.code?.replace(/\s+/g, '_');

        if (!folderName) {
            return res.status(404).json({ error: 'Cruise not found' });
        }

        const voucherDir = path.join(UPLOADS_BASE_PATH, 'cruises', folderName, 'vouchers');
        const imageRelativePath = await processVoucherFile(file, numberCard, voucherDir) ;

        if (imageRelativePath) {
            updateData.image = imageRelativePath;
            await ConsumerCardService.updateCortecyCard({ image: imageRelativePath }, card_id);

            res.status(200).json({ data: 'resource updated successfully' });
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}


const ConsumerCardController = {
    createConsumerCard,
    updateConsumerCard,
    createCortecyCard,
    updateCortecyCard
}
module.exports = ConsumerCardController