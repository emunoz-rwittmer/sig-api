const path = require('path');
const RegulationService = require('../../services/rrhh/regulations.services');
const Utils = require('../../utils/Utils');
const FormatService = require('../../services/rrhh/formats.services');

const downloadReglamento = async (req, res) => {
    try {
        const ruleId = Utils.decode(req.params.rule_id);
        const regulation = await RegulationService.getRegulationById(ruleId);
        const relativePath = regulation.dataValues.file; 

        if (!relativePath) {
            return res.status(404).json({ message: 'El reglamento no tiene archivo asociado' });
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


const DonwloadController = {
    downloadReglamento,
    downloadFormato,
    downloadSolicitud
}

module.exports = DonwloadController 