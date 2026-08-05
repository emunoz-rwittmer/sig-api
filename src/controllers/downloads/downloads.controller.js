const RegulationService = require('../../services/rrhh/regulations.services');
const FormatService = require('../../services/rrhh/formats.services');
const ShippingGuideService = require('../../services/operations/shippingGuide/shippingGuide.services');
const CruiseService = require('../../services/bar/cruise.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const UPLOADS_ROOT = path.join(PROJECT_ROOT, 'uploads');

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

const sanitizeFilenameBase = (value) => {
    const invalidFilenameChars = '/\\?%*:|"<>';
    const withoutInvalidChars = Array.from(String(value ?? ''))
        .filter((character) => {
            const code = character.charCodeAt(0);
            return code > 31 && code !== 127 && !invalidFilenameChars.includes(character);
        })
        .join('');
    const cleaned = withoutInvalidChars
        .replace(/\s+/g, '_')
        .replace(/^[._]+|[._]+$/g, '')
        .slice(0, 100);
    return cleaned || 'archivo';
};

const sendFileDownload = (res, next, { relativePath, filenameBase, missingFileMessage }) => {
    if (!relativePath) throw new AppError(missingFileMessage, 404);

    // Registros historicos guardados en Windows traen backslashes.
    const normalized = String(relativePath).replace(/\\/g, '/');
    const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const absolutePath = path.resolve(PROJECT_ROOT, `.${withLeadingSlash}`);

    // path.join colapsa '..' en silencio; sin este guard un dato corrupto
    // en DB sirve cualquier archivo del disco.
    if (!absolutePath.startsWith(UPLOADS_ROOT + path.sep)) {
        throw new AppError('Archivo no encontrado', 404);
    }
    if (!fs.existsSync(absolutePath)) {
        throw new AppError('Archivo no encontrado', 404);
    }

    // mime.lookup devuelve false (no null) para extensiones desconocidas.
    res.setHeader('Content-Type', mime.lookup(absolutePath) || 'application/octet-stream');
    const extension = path.extname(absolutePath).toLowerCase();

    res.download(absolutePath, `${sanitizeFilenameBase(filenameBase)}${extension}`, (err) => {
        if (!err) return;
        if (res.headersSent) {
            console.error('Error enviando archivo tras iniciar la respuesta:', err);
            return res.destroy();
        }
        next(err);
    });
};

const downloadReglamento = async (req, res, next) => {
    try {
        const ruleId = decodeId(req.params.rule_id, 'rule_id');
        const regulation = await RegulationService.getRegulationById(ruleId);
        if (!regulation) throw new AppError('Reglamento no encontrado', 404);

        sendFileDownload(res, next, {
            relativePath: regulation.dataValues.file,
            filenameBase: regulation.dataValues.name,
            missingFileMessage: 'El reglamento no tiene archivo asociado',
        });
    } catch (error) {
        next(error);
    }
};

const downloadFormato = async (req, res, next) => {
    try {
        const formatId = decodeId(req.params.format_id, 'format_id');
        const format = await FormatService.getDoctorFormat(formatId);
        if (!format) throw new AppError('Formato médico no encontrado', 404);

        sendFileDownload(res, next, {
            relativePath: format.dataValues.file,
            filenameBase: format.dataValues.name,
            missingFileMessage: 'El formato médico no tiene archivo asociado',
        });
    } catch (error) {
        next(error);
    }
};

const downloadSolicitud = async (req, res, next) => {
    try {
        const requestId = decodeId(req.params.request_id, 'request_id');
        const request = await FormatService.getRequestById(requestId);
        if (!request) throw new AppError('Solicitud no encontrada', 404);

        sendFileDownload(res, next, {
            relativePath: request.dataValues.file,
            filenameBase: `Solicitud_${request.dataValues.name}`,
            missingFileMessage: 'La solicitud no tiene archivo asociado',
        });
    } catch (error) {
        next(error);
    }
};

const downloadGuiaRemision = async (req, res, next) => {
    try {
        const guideId = decodeId(req.params.guide_id, 'guide_id');
        const guide = await ShippingGuideService.getShippingGuideById(guideId);
        if (!guide) throw new AppError('Guía de remisión no encontrada', 404);

        sendFileDownload(res, next, {
            relativePath: guide.dataValues.file,
            filenameBase: `guia_remision_${guide.dataValues.counter}`,
            missingFileMessage: 'La guía de remisión no tiene archivo asociado',
        });
    } catch (error) {
        next(error);
    }
};

const downloadreportePdf = async (req, res, next) => {
    try {
        const cruiseId = decodeId(req.params.cruise_id, 'cruise_id');
        // getCruiseById devuelve un objeto plano, no una instancia Sequelize.
        const cruise = await CruiseService.getCruiseById(cruiseId);
        if (!cruise) throw new AppError('Crucero no encontrado', 404);

        sendFileDownload(res, next, {
            relativePath: cruise.urlPDFReport,
            filenameBase: `reporte_crucero_${cruise.code}`,
            missingFileMessage: 'El crucero no tiene reporte PDF asociado',
        });
    } catch (error) {
        next(error);
    }
};

const downloadreporteExcel = async (req, res, next) => {
    try {
        const cruiseId = decodeId(req.params.cruise_id, 'cruise_id');
        // getCruiseById devuelve un objeto plano, no una instancia Sequelize.
        const cruise = await CruiseService.getCruiseById(cruiseId);
        if (!cruise) throw new AppError('Crucero no encontrado', 404);

        sendFileDownload(res, next, {
            relativePath: cruise.urlExcelReport,
            filenameBase: `reporte_crucero_${cruise.code}`,
            missingFileMessage: 'El crucero no tiene reporte Excel asociado',
        });
    } catch (error) {
        next(error);
    }
};


const DownloadController = {
    downloadReglamento,
    downloadFormato,
    downloadSolicitud,
    downloadGuiaRemision,
    downloadreportePdf,
    downloadreporteExcel
}

module.exports = DownloadController
