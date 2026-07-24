const CruiseService = require('../../services/bar/cruise.services');
const Utils = require('../../utils/Utils');
const fs = require('fs');
const path = require('path');
const CruiseReportExcelService = require('../../services/bar/cruiseReportExcel.services');
const CruiseReportPDFService = require('../../services/bar/cruiseReportPDF.services');
const MailsWithAttachments = require('../../mails/mailsWithAttachments');
const RequestService = require('../../services/operations/yachtRequest/yachtRequest.services');


const getAllCruises = async (req, res) => {
    try {
        const result = await CruiseService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.yachtId = Utils.encode(x.dataValues.yachtId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getCruise = async (req, res) => {
    try {
        const cruiseId = Utils.decode(req.params.cruise_id);
        const result = await CruiseService.getCruiseById(cruiseId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const sendCruiseReport = async (req, res) => {
    let excelPath, pdfPath;

    try {
        const cruiseId = Utils.decode(req.params.cruise_id);
        const userId = Utils.decode(req.query.user_id);
        const data = req.body;

        await CruiseService.updateCruise(cruiseId, data);

        const cruise = await CruiseService.getCruiseById(cruiseId);
        if (!cruise) {
            return res.status(404).json({ message: 'Crucero no encontrado' });
        }

        const emailTo = ['fabian@rwittmer.com', 'rosa@tiptoptravel.ec', 'enrique@rwittmer.com'];
        const emailCc = 'edison@tiptoptravel.ec';

        const consumerPassengers = cruise.passengers.filter(
            (p) => p.consumer_card && p.consumer_card.totalCount > 0 && p.consumer_card.paidAccount === true
        );

        const consumerCards = consumerPassengers.map((passenger) => ({
            ...passenger.consumer_card,
            passenger: {
                id: passenger.id,
                name: passenger.name,
                identificationNumber: passenger.identificationNumber,
                type: passenger.type,
                cabin: passenger.cabin,
                country: passenger.country,
                email: passenger.email,
                nationality: passenger.nationality,
                cruise,
                cruiseStartDate: cruise.startDate,
                cruiseEndDate: cruise.endDate,
            },
        }));

        const cortecyCards = (cruise.cortecy_cards || []).map((card) => ({
            ...card,
            cruise,
        }));

        if (consumerCards.length === 0 && cortecyCards.length === 0) {
            throw new Error('No hay consumer cards o cortecy cards válidas para este crucero');
        }

        const uploadsDir = path.join(__dirname, '../../..', 'uploads', 'cruises', cruise.code, 'reports');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const baseName = `report_${cruise.code}`;

        excelPath = path.join(uploadsDir, `${baseName}.xlsx`);
        pdfPath = path.join(uploadsDir, `${baseName}.pdf`);

        const [excelResult, pdfResult] = await Promise.all([
            CruiseReportExcelService.generateCruiseReportExcel(
                cruise,
                consumerPassengers,
                cortecyCards,
                excelPath
            ),
            CruiseReportPDFService.generateCruiseReportPDF(cruise, consumerPassengers, cortecyCards, pdfPath)
        ]);

        const urlPDF = `/uploads/cruises/${cruise.code}/reports/${baseName}.pdf`;
        const urlExcel = `/uploads/cruises/${cruise.code}/reports/${baseName}.xlsx`;

        await MailsWithAttachments.sendCruiseReportEmail(
            emailTo,
            cruise,
            excelPath,
            pdfPath,
            emailCc
        );

        const cruiseUpdate = {
            urlPDFReport: urlPDF,
            urlExcelReport: urlExcel
        };

        const transferDayNumber = Number(cruise.transferDay || 0);
        if (transferDayNumber > 0) {
            const reportDate = new Date();
            reportDate.setHours(0, 0, 0, 0);

            const cruiseStartDate = new Date(cruise.startDate);
            cruiseStartDate.setHours(0, 0, 0, 0);

            const transferDate = new Date(cruiseStartDate);
            transferDate.setDate(transferDate.getDate() + transferDayNumber - 1);

            const dayBeforeTransfer = new Date(transferDate);
            dayBeforeTransfer.setDate(dayBeforeTransfer.getDate() - 1);

            const isTransferDay = reportDate.getTime() === transferDate.getTime();
            const isDayBeforeTransfer = reportDate.getTime() === dayBeforeTransfer.getTime();

            if (!isTransferDay && !isDayBeforeTransfer) {
                cruiseUpdate.cruiseState = 'under review';
            }
        } else {
            cruiseUpdate.cruiseState = 'under review';
        }

        await CruiseService.updateCruise(cruiseId, cruiseUpdate);

        RequestService.createDrinkRequest(cruise.yachtId, userId).catch(error => {
            console.error('Error creando drink request:', error);
        });

        res.status(200).json({ data: 'Reporte de crucero generado y enviado correctamente' });

    } catch (error) {
        console.log(error);
        try {
            if (excelPath && fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
            if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        } catch (cleanupError) {
            console.log('Error limpiando archivos:', cleanupError);
        }

        res.status(400).json(error.message);
    }
}

const updateCruise = async (req, res) => {
    try {
        const cruiseId = Utils.decode(req.params.cruise_id);
        const data = req.body;

        await CruiseService.updateCruise(cruiseId, data);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}


const CruiseController = {
    getAllCruises,
    getCruise,
    sendCruiseReport,
    updateCruise
}
module.exports = CruiseController