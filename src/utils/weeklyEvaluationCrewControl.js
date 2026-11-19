const moment = require('moment');
const WeeklyEvaluationSetting = require('../models/operations/surveys/weeklyEvaluationSetting.models');

// El estado vive en `weekly_evaluation_settings` y se cambia desde el panel
// (Evaluaciones → Envío semanal). Una empresa sin fila se considera activa.

function validateCompanyId(companyId) {
    if (!Number.isInteger(companyId) || companyId <= 0) {
        throw new TypeError('companyId debe ser un entero positivo');
    }
    return companyId;
}

async function getDisabledCompanyIds() {
    const rows = await WeeklyEvaluationSetting.findAll({
        where: { enabled: false },
        attributes: ['companyId'],
    });
    return new Set(rows.map((row) => row.companyId));
}

async function setWeeklyEvaluationCrewEnabled({ companyId, enabled }) {
    validateCompanyId(companyId);
    if (typeof enabled !== 'boolean') {
        throw new TypeError('enabled debe ser booleano');
    }

    const [setting] = await WeeklyEvaluationSetting.findOrCreate({
        where: { companyId },
        defaults: { companyId, enabled },
    });
    if (setting.enabled !== enabled) {
        await setting.update({ enabled });
    }
    return enabled;
}

// Semana evaluada: de viernes a viernes, empezando el último viernes <= now.
function getEvaluationPeriod(now = moment()) {
    const weekStart = moment(now).day(5).startOf('day');
    if (weekStart.isAfter(now)) {
        weekStart.subtract(7, 'days');
    }
    return `${weekStart.format('YYYY-MM-DD')}_${weekStart.clone().add(7, 'days').format('YYYY-MM-DD')}`;
}

module.exports = {
    validateCompanyId,
    getDisabledCompanyIds,
    setWeeklyEvaluationCrewEnabled,
    getEvaluationPeriod,
};
