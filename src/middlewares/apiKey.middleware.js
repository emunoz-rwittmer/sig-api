const verifyPowerBIDatasetKey = (req, res, next) => {
    const expectedKey = process.env.POWERBI_DATASET_API_KEY;

    if (!expectedKey) {
        return res.status(500).json({ data: 'Power BI dataset key no configurada' });
    }

    const providedKey = req.headers['x-powerbi-key'];
    if (!providedKey || providedKey !== expectedKey) {
        return res.status(401).json({ data: 'API key inválida' });
    }

    return next();
};

module.exports = { verifyPowerBIDatasetKey };
