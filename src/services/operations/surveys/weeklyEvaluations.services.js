const Yacht = require('../../../models/catalogs/yacht.models');
const Company = require('../../../models/catalogs/company.models');
const FormRespond = require('../../../models/operations/surveys/formRespond.models');
const {
    getDisabledCompanyIds,
    getEvaluationPeriod,
    setWeeklyEvaluationCrewEnabled,
} = require('../../../utils/weeklyEvaluationCrewControl');
const CronJobs = require('../../../controllers/cronJobs.controller');
const AppError = require('../../../errors/AppError');

const countByCompany = (evaluations) => {
    const counts = {};
    for (const { companyId, state } of evaluations) {
        const key = Number(companyId);
        counts[key] ??= { total: 0, pending: 0 };
        counts[key].total += 1;
        if (state === 'Pendiente') counts[key].pending += 1;
    }
    return counts;
};

class WeeklyEvaluationsService {
    /** Barcos activos con su estado de envío y lo creado en la semana evaluada actual. */
    static async getStatus() {
        const periodWeek = getEvaluationPeriod();
        const [yachts, disabled, evaluations] = await Promise.all([
            Yacht.findAll({
                where: { active: true },
                attributes: ['id', 'name', 'code', 'color', 'companyId'],
                include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'active'] }],
                order: [['name', 'ASC']],
            }),
            getDisabledCompanyIds(),
            FormRespond.findAll({ where: { periodWeek }, attributes: ['companyId', 'state'], raw: true }),
        ]);
        const counts = countByCompany(evaluations);

        return {
            periodWeek,
            yachts: yachts.map((yacht) => ({
                companyId: yacht.companyId,
                yachtName: yacht.name,
                yachtCode: yacht.code,
                color: yacht.color,
                companyName: yacht.company?.name ?? null,
                enabled: !disabled.has(yacht.companyId),
                currentWeek: counts[yacht.companyId] ?? { total: 0, pending: 0 },
            })),
        };
    }

    static async setEnabled(companyId, enabled) {
        const company = await Company.findByPk(companyId, { attributes: ['id'] });
        if (!company) throw new AppError('Empresa no encontrada', 404);
        return setWeeklyEvaluationCrewEnabled({ companyId, enabled });
    }

    static async sendNow(companyIds) {
        const disabled = await getDisabledCompanyIds();
        const blocked = companyIds.filter((id) => disabled.has(id));
        if (blocked.length) {
            throw new AppError('Activa el envío semanal del barco antes de enviar sus evaluaciones', 400);
        }
        return CronJobs.sendWeeklyEvaluationCrewNow(companyIds);
    }
}

module.exports = WeeklyEvaluationsService;
