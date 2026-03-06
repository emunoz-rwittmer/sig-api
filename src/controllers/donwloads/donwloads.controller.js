const RegulationService = require('../../services/rrhh/regulations.services');
const FormatService = require('../../services/rrhh/formats.services');
const ShippingGuideService = require('../../services/operations/shippingGuide/shippingGuide.services');
const Utils = require('../../utils/Utils');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const downloadReglamento = async (req, res) => {
    try {
        const ruleId = Utils.decode(req.params.rule_id);
        const regulation = await RegulationService.getRegulationById(ruleId);
        const relativePath = regulation.dataValues.file;

        if (!relativePath) {
            return res.status(404).json({ message: 'El reglamento no tiene archivo asociado' });
        }

        const absolutePath = path.join(__dirname, '../../../', relativePath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        const mimeType = mime.lookup(absolutePath);  // puede devolver null si no encuentra
        const extension = mime.extension(mimeType);

        const filename = `reglamento-${ruleId}.${extension}`; // o usa el nombre original si lo prefieres

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(absolutePath);
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
};

const downloadFormato = async (req, res) => {
    try {
        const formatId = Utils.decode(req.params.format_id);
        const format = await FormatService.getDoctorFormat(formatId);
        const relativePath = format.dataValues.file;

        if (!relativePath) {
            return res.status(404).json({ message: 'El formato no tiene archivo asociado' });
        }

        const absolutePath = path.join(__dirname, '../../../', relativePath);
        res.download(absolutePath, (err) => {
            if (err) {
                res.status(500).send('Error al descargar el archivo');
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json(error.message);
    }
};

const downloadSolicitud = async (req, res) => {
    try {
        const requestId = Utils.decode(req.params.request_id);
        const format = await FormatService.getRequestById(requestId);
        const relativePath = format.dataValues.file;

        if (!relativePath) {
            return res.status(404).json({ message: 'El formato no tiene archivo asociado' });
        }

        const absolutePath = path.join(__dirname, '../../../', relativePath);
        res.download(absolutePath, (err) => {
            if (err) {
                console.log(err)
                res.status(500).send('Error al descargar el archivo');
            }
        });
    } catch (error) {
        res.status(400).json(error.message);
    }
};

const downloadGuiaRemision = async (req, res) => {
    try {
        const guideId = Utils.decode(req.params.guide_id);
        const regulation = await ShippingGuideService.getShippingGuideById(guideId);
        const relativePath = regulation.dataValues.file;

        if (!relativePath) {
            return res.status(404).json({ message: 'la guia no tiene archivo asociado' });
        }

        const absolutePath = path.join(__dirname, '../../../', relativePath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        const mimeType = mime.lookup(absolutePath);  // puede devolver null si no encuentra
        const extension = mime.extension(mimeType);

        const filename = `guia_remision_${regulation.counter}.${extension}`;

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(absolutePath);
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
};


const DonwloadController = {
    downloadReglamento,
    downloadFormato,
    downloadSolicitud,
    downloadGuiaRemision
}

module.exports = DonwloadController 