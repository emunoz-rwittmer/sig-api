const path = require('path');
const RegulationService = require('../../services/rrhh/regulations.services');
const Utils = require('../../utils/Utils');

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


const DonwloadController = {
    downloadReglamento
}

module.exports = DonwloadController 