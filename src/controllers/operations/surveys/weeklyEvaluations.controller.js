const WeeklyEvaluationsService = require('../../../services/operations/surveys/weeklyEvaluations.services');
const Utils = require('../../../utils/Utils');
const AppError = require('../../../errors/AppError');

const decodeCompanyId = (value) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        id = undefined;
    }
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Empresa inválida', 400);
    return id;
};

const encodeCompany = (yacht) => ({ ...yacht, companyId: Utils.encode(yacht.companyId) });

const getStatus = async (req, res, next) => {
    try {
        const status = await WeeklyEvaluationsService.getStatus();
        res.status(200).json({ ...status, yachts: status.yachts.map(encodeCompany) });
    } catch (error) {
        next(error);
    }
};

const setEnabled = async (req, res, next) => {
    try {
        const companyId = decodeCompanyId(req.params.company_id);
        if (typeof req.body?.enabled !== 'boolean') throw new AppError('enabled debe ser booleano', 400);
        const enabled = await WeeklyEvaluationsService.setEnabled(companyId, req.body.enabled);
        res.status(200).json({ data: { companyId: req.params.company_id, enabled } });
    } catch (error) {
        next(error);
    }
};

const sendNow = async (req, res, next) => {
    try {
        const raw = req.body?.companyIds;
        if (!Array.isArray(raw) || !raw.length) throw new AppError('Selecciona al menos un barco', 400);
        const companyIds = [...new Set(raw.map(decodeCompanyId))];
        const result = await WeeklyEvaluationsService.sendNow(companyIds);
        const createdByCompany = Object.fromEntries(
            Object.entries(result.createdByCompany).map(([id, total]) => [Utils.encode(Number(id)), total]),
        );
        res.status(200).json({ data: { ...result, createdByCompany } });
    } catch (error) {
        next(error);
    }
};

module.exports = { getStatus, setEnabled, sendNow };
