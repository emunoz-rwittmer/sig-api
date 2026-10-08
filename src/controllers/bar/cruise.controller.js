const CruiseService = require('../../services/bar/cruise.services');
const Utils = require('../../utils/Utils');
const fs = require('fs');
const path = require('path');
const CruiseReportExcelService = require('../../services/bar/cruiseReportExcel.services');
const CruiseReportPDFService = require('../../services/bar/cruiseReportPDF.services');
const MailsWithAttachments = require('../../mails/mailAttachments');
const RequestService = require('../../services/operations/yachtRequest/yachtRequest.services');
const AppError = require('../../errors/AppError');
const Passenger = require('../../models/bar/passenger.models');

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

const PARTIAL_REPORT_MESSAGE = 'Reporte parcial PP generado y enviado correctamente';

/**
 * El informe es parcial (solo PP, crucero abierto) el día del traslado o el
 * día anterior; el traslado es el día `transferDay` contado desde el inicio.
 */
const isPartialReportDay = (cruise) => {
    const transferDayNumber = Number(cruise.transferDay || 0);
    if (transferDayNumber <= 0) return false;

    const reportDate = new Date();
    reportDate.setHours(0, 0, 0, 0);

    const transferDate = new Date(cruise.startDate);
    transferDate.setHours(0, 0, 0, 0);
    transferDate.setDate(transferDate.getDate() + transferDayNumber - 1);

    const dayBeforeTransfer = new Date(transferDate);
    dayBeforeTransfer.setDate(dayBeforeTransfer.getDate() - 1);

    return reportDate.getTime() === transferDate.getTime() || reportDate.getTime() === dayBeforeTransfer.getTime();
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

        const isPartial = isPartialReportDay(cruise);

        // Informe parcial: solo los PP; informe final: todos los que no se liquidaron antes.
        const activePassengers = cruise.passengers.filter((p) => !p.settled);
        const reportPassengers = isPartial ? activePassengers.filter((p) => p.type === 'PP') : activePassengers;

        // Un PP con saldo sin cobrar no puede salir del crucero: se cobra antes de enviar el parcial.
        if (isPartial) {
            const unpaidPassengers = reportPassengers.filter(
                (p) => p.consumer_card && p.consumer_card.totalCount > 0 && p.consumer_card.paidAccount !== true
            );
            if (unpaidPassengers.length > 0) {
                throw new AppError(`Hay ${unpaidPassengers.length} pasajero(s) PP con saldo sin cobrar`, 400);
            }
        }

        const consumerPassengers = reportPassengers.filter(
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

        // Las cortesías son del crucero completo: solo van en el informe final.
        const cortecyCards = isPartial ? [] : (cruise.cortecy_cards || []).map((card) => ({
            ...card,
            cruise,
        }));

        if (consumerCards.length === 0 && cortecyCards.length === 0) {
            if (!isPartial) {
                throw new AppError('No hay consumer cards o cortecy cards válidas para este crucero', 400);
            }
            // Parcial sin consumos de PP: no hay nada que reportar, solo se liquidan.
            await Passenger.update({ settled: true }, { where: { cruiseId, type: 'PP', settled: false } });
            return res.status(200).json({ data: PARTIAL_REPORT_MESSAGE });
        }

        const uploadsDir = path.join(__dirname, '../../..', 'uploads', 'cruises', cruise.code, 'reports');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const baseName = isPartial ? `report_${cruise.code}_PP` : `report_${cruise.code}`;

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

        if (isPartial) {
            // El crucero sigue abierto: los PP reportados salen de la operación.
            await Passenger.update({ settled: true }, { where: { cruiseId, type: 'PP', settled: false } });
        } else {
            await CruiseService.updateCruise(cruiseId, {
                urlPDFReport: urlPDF,
                urlExcelReport: urlExcel,
                cruiseState: 'under review',
            });
        }

        RequestService.createDrinkRequest(cruise.yachtId, userId).catch(error => {
            console.error('Error creando drink request:', error);
        });

        res.status(200).json({ data: isPartial ? PARTIAL_REPORT_MESSAGE : 'Reporte de crucero generado y enviado correctamente' });

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