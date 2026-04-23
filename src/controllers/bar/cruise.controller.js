const CruiseService = require('../../services/bar/cruise.services');
const Utils = require('../../utils/Utils');

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
    let excelPath, pdfPath, zipPath;

    try {
        const fs = require('fs');
        const path = require('path');
        const archiver = require('archiver');
        const CruiseReportExcelService = require('../../services/bar/cruiseReportExcel.service');
        const CruiseReportPDFService = require('../../services/bar/cruiseReportPDF.service');
        const MailsWithAttachments = require('../../mails/mailsWithAttachments');

        const cruiseId = Utils.decode(req.params.cruise_id);
        const data = req.body
        
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

        const uploadsDir = path.join(__dirname, '../../..', 'uploads', 'reports');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const baseName = `cruise_report_${cruise.code}_${timestamp}`;

        excelPath = path.join(uploadsDir, `${baseName}.xlsx`);
        await CruiseReportExcelService.generateCruiseReportExcel(cruise, passengersWithCards, excelPath);

        pdfPath = path.join(uploadsDir, `${baseName}.pdf`);
        await CruiseReportPDFService.generateCruiseReportPDF(cruise, passengersWithCards, pdfPath);

        zipPath = path.join(uploadsDir, `${baseName}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        await new Promise((resolve, reject) => {
            archive.on('error', reject);
            output.on('close', resolve);
            archive.pipe(output);
            archive.file(excelPath, { name: `${baseName}.xlsx` });
            archive.file(pdfPath, { name: `${baseName}.pdf` });
            archive.finalize();
        });

        await MailsWithAttachments.sendCruiseReportEmail(
            emailTo,
            cruise,
            excelPath,
            pdfPath,
            zipPath,
            emailCc
        );

        await CruiseService.updateCruise(cruiseId, {cruiseState: 'under review'});

        setTimeout(() => {
            try {
                if (fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
                if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            } catch (error) {
                console.error('Error limpiando archivos temporales:', error);
            }
        }, 30000);

        res.status(200).json({ data: 'Reporte de crucero generado y enviado correctamente' });

    } catch (error) {
        console.error('Error en sendCruiseReport:', error);
        try {
            if (excelPath && fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
            if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
            if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
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