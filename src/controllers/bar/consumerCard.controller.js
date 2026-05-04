const { cos } = require('mathjs');
const ConsumerCardCount = require('../../models/bar/consumerCardCount.model');
const ConsumerCardService = require('../../services/bar/consumerCard.services');
const CruiseService = require('../../services/bar/cruise.services');
const Utils = require('../../utils/Utils');
const fs = require('fs');
const path = require('path');

const ProductBar = require('../../models/bar/productBar.models');
const { sendBarConsumption, sendInvoiceEmail } = require('../../mails/mailer');
const { passengerInvoicePDF } = require('../../services/bar/passengerInvoicePDF.service');

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

            //await sendBarConsumption(dataMail, result.passenger.email);
        }

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {

        res.status(400).json(error.message);
    }
};

const updateConsumerCard = async (req, res) => {
    try {
        const consumerCardId = req.params.card_id;
        const cruiseId = Utils.decode(req.body.cruiseId);
        const data = req.body;
        const file = req.file;
        delete data.id

        const cruise = await CruiseService.getCruiseById(cruiseId);
        const folderName = `${cruise.code}`.replace(/\s+/g, '_');

        if (file) {
            const voucherDir = path.join(__dirname, '../../../uploads/cruises', folderName, 'vouchers');
            if (!fs.existsSync(voucherDir)) {
                fs.mkdirSync(voucherDir, { recursive: true });
            }

            const fileName = `${data.numberCard}.${file.mimetype.split('/')[1]}`.replace(/\s+/g, '_');
            const filePath = path.join(voucherDir, fileName);
            const relativePath = path.relative(path.join(__dirname, '../../../'), filePath);

            await fs.promises.rename(file.path, filePath);

            data.image = `/${relativePath}`;
        }

        const result = await ConsumerCardService.updateConsumerCard(data, consumerCardId);
        console.log(data)
        if (data.paidAccount === 'null') {
            const resultPlain = result.get({ plain: true });

            const invoiceDir = path.join(__dirname, '../../../uploads/cruises', folderName, 'invoices');
            if (!fs.existsSync(invoiceDir)) {
                fs.mkdirSync(invoiceDir, { recursive: true });
            }

            const invoicePath = path.join(invoiceDir, `invoice_${data.numberCard}.pdf`);
            await passengerInvoicePDF(resultPlain, invoicePath);

            if (result && result.passenger && result.passenger.email) {
                const mailData = {
                    passengerName: resultPlain.passenger.name,
                    passengerEmail: resultPlain.passenger.email,
                    date: new Date().toLocaleDateString(),
                    yacht: cruise.yacht?.code,
                    invoicePath: invoicePath
                };

                await sendInvoiceEmail(mailData);
            }
        }
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

//Cortecy Card

const createCortecyCard = async (req, res) => {
    try {
        const data = req.body;
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


const ConsumerCardController = {
    createConsumerCard,
    updateConsumerCard,
    createCortecyCard
}
module.exports = ConsumerCardController