const { cos } = require('mathjs');
const fs = require('fs').promises;
const path = require('path');

const ConsumerCardCount = require('../../models/bar/consumerCardCount.model');
const ConsumerCardService = require('../../services/bar/consumerCard.services');
const CruiseService = require('../../services/bar/cruise.services');
const ProductBar = require('../../models/bar/productBar.models');
const Utils = require('../../utils/Utils');
const { sendBarConsumption, sendInvoiceEmail } = require('../../mails/mailer');
const { passengerInvoicePDF } = require('../../services/bar/passengerInvoicePDF.services');
const { generateConsumerCardReportExcel } = require('../../services/bar/consumerCardReportExcel.services');
const Yacht = require('../../models/catalogs/yacht.models');
const AppError = require('../../errors/AppError');

// Constantes
const UPLOADS_BASE_PATH = path.resolve(__dirname, '../../../uploads');

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

const getAllConsumer = async (req, res) => {
    try {
        const { year, start, end } = req.query;
        const yachtId = Utils.decode(req.query.yachtId);

        const consumerCards = await ConsumerCardService.getAllConsumerCards(yachtId, year, start, end);
        const cortecyCards = await ConsumerCardService.getAllCortecyCards(yachtId, year, start, end);

        const plaintConsumer = consumerCards.map(r => r.get({ plain: true }));
        const plaintCortecy = cortecyCards.map(r => r.get({ plain: true }));

        if (plaintConsumer instanceof Array) {
            plaintConsumer.map((x) => {
                x.id = Utils.encode(x.id);
            });
        }

        if (plaintCortecy instanceof Array) {
            plaintCortecy.map((x) => {
                x.id = Utils.encode(x.id);
            });
        }

        res.status(200).json({ consumerCards: plaintConsumer, cortecyCards: plaintCortecy });
    } catch (error) {
        res.status(400).json(error.message)
    }
}

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
        const imageRelativePath = await processVoucherFile(file, numberCard, voucherDir);

        if (imageRelativePath) {
            updateData.image = imageRelativePath;
            await ConsumerCardService.updateCortecyCard({ image: imageRelativePath }, card_id);

            res.status(200).json({ data: 'resource updated successfully' });
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

const exportConsumerCardReport = async (req, res, next) => {
    try {
        const { year, start, end } = req.query;
        const yachtId = decodeId(req.query.yachtId, 'yachtId');

        // Obtener información del yate
        const yacht = await Yacht.findByPk(yachtId, {
            attributes: ['id', 'name', 'code']
        });

        if (!yacht) {
            throw new AppError('Yate no encontrado', 404);
        }

        // Obtener consumer cards y cortecy cards filtradas
        const consumerCards = await ConsumerCardService.getAllConsumerCards(yachtId, year, start, end);
        const cortecyCards = await ConsumerCardService.getAllCortecyCards(yachtId, year, start, end);

        // Crear directorio si no existe
        const excelDir = path.join(UPLOADS_BASE_PATH, 'reports');
        await fs.mkdir(excelDir, { recursive: true });

        // Generar nombre del archivo
        const fileName = `consumer_report_${yacht.name}.xlsx`;
        const filePath = path.join(excelDir, fileName);

        // Generar el Excel
        await generateConsumerCardReportExcel(yacht.name, start, end, consumerCards, cortecyCards, filePath);

        // Enviar archivo
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Error sending file:', err);
            }
            // Opcionalmente eliminar archivo después de enviarlo
            fs.unlink(filePath).catch(err => console.error('Error deleting file:', err));
        });

    } catch (error) {
        next(error);
    }
};


const ConsumerCardController = {
    getAllConsumer,
    createConsumerCard,
    updateConsumerCard,
    createCortecyCard,
    updateCortecyCard,
    exportConsumerCardReport
}
module.exports = ConsumerCardController