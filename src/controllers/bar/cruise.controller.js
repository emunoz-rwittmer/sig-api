const CruiseService = require('../../services/bar/cruise.services');
const Utils = require('../../utils/Utils');
const fs = require('fs');
const path = require('path');
const CruiseReportExcelService = require('../../services/bar/cruiseReportExcel.services');
const CruiseReportPDFService = require('../../services/bar/cruiseReportPDF.services');
const MailsWithAttachments = require('../../mails/mailAttachments');
const RequestService = require('../../services/operations/yachtRequest/yachtRequest.services');
const AppError = require('../../errors/AppError');

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

const getAllCruises = async (req, res, next) => {
    try {
        const result = await CruiseService.getAll();
        result.forEach((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
            x.dataValues.yachtId = Utils.encode(x.dataValues.yachtId);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getCruise = async (req, res, next) => {
    try {
        const cruiseId = decodeId(req.params.cruise_id, 'cruise_id');
        const result = await CruiseService.getCruiseById(cruiseId);
        if (!result) throw new AppError('Crucero no encontrado', 404);
        result.id = Utils.encode(result.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const sendCruiseReport = async (req, res, next) => {
    let excelPath, pdfPath;

    try {
        const cruiseId = decodeId(req.params.cruise_id, 'cruise_id');
        const userId = decodeId(req.query.user_id, 'user_id');
        const data = req.body;

        await CruiseService.updateCruise(cruiseId, data);

        const cruise = await CruiseService.getCruiseById(cruiseId);

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
            throw new AppError('No hay consumer cards o cortecy cards válidas para este crucero', 400);
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
        try {
            if (excelPath && fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
            if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        } catch (cleanupError) {
            console.error('Error limpiando archivos del reporte de crucero:', cleanupError);
        }

        next(error);
    }
}

const updateCruise = async (req, res, next) => {
    try {
        const cruiseId = decodeId(req.params.cruise_id, 'cruise_id');
        const data = req.body;

        await CruiseService.updateCruise(cruiseId, data);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}


const CruiseController = {
    getAllCruises,
    getCruise,
    sendCruiseReport,
    updateCruise
}
module.exports = CruiseController