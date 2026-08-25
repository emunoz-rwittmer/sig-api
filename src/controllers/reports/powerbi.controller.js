const { getReportEmbedConfig } = require('../../services/reports/powerbiEmbed.services');
const { getEvaluationsDatasetRows } = require('../../services/reports/powerbiDataset.services');

const getPowerBIEmbedConfig = async (req, res, next) => {
    try {
        const { reportKey } = req.params;
        const embedConfig = await getReportEmbedConfig(reportKey);
        res.status(200).json(embedConfig);
    } catch (error) {
        next(error);
    }
};

const getEvaluationsPowerBIDataset = async (req, res, next) => {
    try {
        const rows = await getEvaluationsDatasetRows();
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPowerBIEmbedConfig,
    getEvaluationsPowerBIDataset,
};
