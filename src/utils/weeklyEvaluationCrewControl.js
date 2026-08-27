// Editar esta lista permite conservar el estado después de reiniciar el servicio.
const initialWeeklyEvaluationCrewStatus = [
    { companyId: 1, enabled: false },
    { companyId: 3, enabled: false }
];

function validateTarget(target) {
    const companyId = target?.companyId;

    if (!Number.isInteger(companyId) || companyId <= 0) {
        throw new TypeError('companyId debe ser un entero positivo');
    }

    return companyId;
}

function createKey(target) {
    return validateTarget(target);
}

const weeklyEvaluationCrewStatus = new Map(
    initialWeeklyEvaluationCrewStatus.map((target) => [createKey(target), target.enabled])
);

function setWeeklyEvaluationCrewEnabled(target) {
    const key = createKey(target);

    if (typeof target.enabled !== 'boolean') {
        throw new TypeError('enabled debe ser booleano');
    }

    weeklyEvaluationCrewStatus.set(key, target.enabled);
    return target.enabled;
}

function isWeeklyEvaluationCrewEnabled(target) {
    const key = createKey(target);
    return weeklyEvaluationCrewStatus.get(key) ?? true;
}

module.exports = {
    setWeeklyEvaluationCrewEnabled,
    isWeeklyEvaluationCrewEnabled
};
