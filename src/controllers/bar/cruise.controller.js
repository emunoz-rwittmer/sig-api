const CruiseService = require('../../services/bar/cruise.services');
const Utils = require('../../utils/Utils');
const fs = require('fs');
const path = require('path');
const CruiseReportExcelService = require('../../services/bar/cruiseReportExcel.service');
const CruiseReportPDFService = require('../../services/bar/cruiseReportPDF.service');
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

        const emailTo = ['fabian@rwittmer.com', 'rosa@tiptoptravel.ec'];
        const emailCc = ['enrique@rwittmer.com', 'edison@tiptoptravel.ec'];

        const passengersWithCards = cruise.passengers.filter(
            (p) => p.consumer_card && p.consumer_card.totalCount > 0 && p.consumer_card.paidAccount === true
        );

        if (passengersWithCards.length === 0) {
            return res.status(400).json({
                message: 'No hay pasajeros con consumer cards válidas para este crucero'
            });
        }

        // Crear directorio: uploads/cruises/reports/
        const uploadsDir = path.join(__dirname, '../../..', 'uploads', 'cruises', cruise.code, 'reports');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const baseName = `report_${cruise.code}`;

        excelPath = path.join(uploadsDir, `${baseName}.xlsx`);
        pdfPath = path.join(uploadsDir, `${baseName}.pdf`);

        // Generar Excel y PDF en paralelo para optimizar tiempo
        const [excelResult, pdfResult] = await Promise.all([
            CruiseReportExcelService.generateCruiseReportExcel(cruise, passengersWithCards, excelPath),
            CruiseReportPDFService.generateCruiseReportPDF(cruise, passengersWithCards, pdfPath)
        ]);

        // Construir URLs relativas para guardar en BD
        const urlPDF = `/uploads/cruises/${cruise.code}/${baseName}.pdf`;
        const urlExcel = `/uploads/cruises/${cruise.code}/${baseName}.xlsx`;

        // Enviar correos con los reportes
        await MailsWithAttachments.sendCruiseReportEmail(
            emailTo,
            cruise,
            excelPath,
            pdfPath,
            emailCc
        );

        // Actualizar BD con URLs de reportes y cambiar estado
        await CruiseService.updateCruise(cruiseId, {
            cruiseState: 'under review',
            urlPDFReport: urlPDF,
            urlExcelReport: urlExcel
        });

        // Crear drink request de forma asíncrona sin bloquear
        RequestService.createDrinkRequest(cruise.yachtId, userId).catch(error => {
            console.error('Error creando drink request:', error);
        });

        res.status(200).json({ data: 'Reporte de crucero generado y enviado correctamente' });

    } catch (error) {
        console.error('Error en sendCruiseReport:', error);
        // Limpiar archivos en caso de error
        try {
            if (excelPath && fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
            if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        } catch (cleanupError) {
            console.error('Error limpiando archivos:', cleanupError);
        }

        res.status(400).json(error.message);
    }
}

const CruiseController = {
    getAllCruises,
    getCruise,
    sendCruiseReport
}
module.exports = CruiseController