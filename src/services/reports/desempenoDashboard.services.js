const EvaluationService = require('../operations/surveys/evaluations.services');
const Staffervice = require('../catalogs/staff.services');
const SurveyScoring = require('../../utils/surveyScoring');
const { extractApellido, extractNombres, capitalizeYachtName } = require('../../utils/reportFormatting');

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function round2(value) {
    return (value === null || value === undefined) ? null : Math.round(value * 100) / 100;
}

function average(numbers) {
    if (!numbers.length) return null;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function evaluationDate(row) {
    return row.updatedAt ? new Date(row.updatedAt) : new Date(row.createdAt);
}

function evaluationScore(row) {
    const numeric = (row.respuestas || [])
        .map((r) => SurveyScoring.asignarPuntaje(r.answer))
        .filter((v) => typeof v === 'number');
    return average(numeric);
}

function yateName(row) {
    return capitalizeYachtName(row.empresa?.yacht?.name) || null;
}

function matchesYate(row, yateFilter) {
    if (!yateFilter) return true;
    const rowYate = yateName(row);
    return !!rowYate && rowYate.toLowerCase() === capitalizeYachtName(yateFilter).toLowerCase();
}

function compliancePercent(completadas, caducadas) {
    const total = completadas + caducadas;
    return total === 0 ? null : Math.round((completadas / total) * 100);
}

function quarterOf(date) {
    return `Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function scoreValue(rows) {
    return round2(average(rows.map(evaluationScore).filter((s) => s !== null)));
}

function complianceValue(rows) {
    const completadas = rows.filter((row) => row.state === 'Completada').length;
    const caducadas = rows.filter((row) => row.state === 'Caducada').length;
    return compliancePercent(completadas, caducadas);
}

function monthlySeriesByYear(rows, computeMonthValue) {
    const years = [...new Set(rows.map((row) => evaluationDate(row).getFullYear()))].sort();
    return {
        categories: MESES,
        series: years.map((year) => ({
            name: String(year),
            data: MESES.map((_, monthIndex) => {
                const monthRows = rows.filter((row) => {
                    const date = evaluationDate(row);
                    return date.getFullYear() === year && date.getMonth() === monthIndex;
                });
                return computeMonthValue(monthRows);
            }),
        })),
    };
}

async function loadEvaluations() {
    return EvaluationService.getEvaluationsByCompany(undefined, undefined, undefined);
}

async function buildCargoMap(rows) {
    const uniqueEvaluados = [...new Set(rows.map((r) => r.evaluated).filter(Boolean))];
    const namePairs = uniqueEvaluados
        .map((evaluado) => ({
            fullName: evaluado,
            firstName: extractNombres(evaluado),
            lastName: extractApellido(evaluado),
        }))
        .filter(({ firstName, lastName }) => firstName && lastName);

    const cargoByFullName = await Staffervice.getPositionsByFullNames(
        namePairs.map(({ firstName, lastName }) => ({ firstName, lastName }))
    );

    return new Map(
        namePairs.map(({ fullName, firstName, lastName }) => [
            fullName,
            cargoByFullName.get(`${firstName} ${lastName}`) || null,
        ])
    );
}

async function getOverview(yateFilter) {
    const rows = (await loadEvaluations()).filter((row) => matchesYate(row, yateFilter));
    const years = [...new Set(rows.map((row) => evaluationDate(row).getFullYear()))].sort();

    const kpisByYear = years.map((year) => {
        const yearRows = rows.filter((row) => evaluationDate(row).getFullYear() === year);
        const completadas = yearRows.filter((row) => row.state === 'Completada').length;
        const caducadas = yearRows.filter((row) => row.state === 'Caducada').length;
        return {
            year,
            calificacion: scoreValue(yearRows),
            compliancePercent: compliancePercent(completadas, caducadas),
            completadas,
            caducadas,
        };
    });

    return {
        years,
        kpisByYear,
        monthlyCalificacion: monthlySeriesByYear(rows, scoreValue),
        monthlyCompliance: monthlySeriesByYear(rows, complianceValue),
    };
}

async function getYates(yateFilter) {
    const allRows = await loadEvaluations();

    const yateGroups = new Map();
    allRows.forEach((row) => {
        const yate = yateName(row);
        if (!yate) return;
        if (!yateGroups.has(yate)) yateGroups.set(yate, []);
        yateGroups.get(yate).push(row);
    });

    const avgByYate = [...yateGroups.entries()]
        .map(([yate, yateRows]) => ({ yate, calificacion: scoreValue(yateRows) }))
        .sort((a, b) => a.yate.localeCompare(b.yate));

    const scoped = allRows.filter((row) => matchesYate(row, yateFilter));
    const completadas = scoped.filter((row) => row.state === 'Completada').length;
    const caducadas = scoped.filter((row) => row.state === 'Caducada').length;

    const monthlyCalificacionByYate = [...yateGroups.entries()]
        .map(([yate, yateRows]) => ({
            yate,
            ...monthlySeriesByYear(yateRows, scoreValue),
        }))
        .sort((a, b) => a.yate.localeCompare(b.yate));

    return {
        avgByYate,
        kpis: {
            completadas,
            caducadas,
            calificacion: scoreValue(scoped),
            compliancePercent: compliancePercent(completadas, caducadas),
        },
        monthlyCalificacion: monthlySeriesByYear(scoped, scoreValue),
        monthlyCompliance: monthlySeriesByYear(scoped, complianceValue),
        monthlyCalificacionByYate,
    };
}

function groupRowsBy(rows, keyFn) {
    const groups = new Map();
    rows.forEach((row) => {
        const key = keyFn(row);
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    });
    return groups;
}

async function getPersonas({ yate, evaluado, funcion, anio } = {}) {
    const allRows = await loadEvaluations();
    const cargoMap = await buildCargoMap(allRows);

    const rows = allRows.filter((row) => {
        if (!matchesYate(row, yate)) return false;
        if (evaluado && row.evaluated?.trim().toLowerCase() !== evaluado.trim().toLowerCase()) return false;
        if (funcion && (cargoMap.get(row.evaluated) || '').toLowerCase() !== funcion.trim().toLowerCase()) return false;
        if (anio && evaluationDate(row).getFullYear() !== Number(anio)) return false;
        return true;
    });

    const monthIndexesPresent = [...new Set(rows.map((row) => evaluationDate(row).getMonth()))].sort((a, b) => a - b);
    const months = monthIndexesPresent.map((monthIndex) => ({ month: MESES[monthIndex], monthIndex: monthIndex + 1 }));

    const porEvaluado = [...groupRowsBy(rows, (row) => row.evaluated).entries()]
        .map(([evaluadoName, personRows]) => ({
            evaluado: evaluadoName,
            porMes: months.map(({ month, monthIndex }) => ({
                month,
                monthIndex,
                valor: scoreValue(personRows.filter((row) => evaluationDate(row).getMonth() === monthIndex - 1)),
            })),
            total: scoreValue(personRows),
        }))
        .sort((a, b) => a.evaluado.localeCompare(b.evaluado));

    const porEvaluadorMensual = [...groupRowsBy(rows, (row) => row.evaluator).entries()]
        .map(([evaluador, evaluatorRows]) => ({
            evaluador,
            porMes: months.map(({ month, monthIndex }) => ({
                month,
                monthIndex,
                valor: complianceValue(evaluatorRows.filter((row) => evaluationDate(row).getMonth() === monthIndex - 1)),
            })),
            total: complianceValue(evaluatorRows),
        }))
        .sort((a, b) => a.evaluador.localeCompare(b.evaluador));

    const porEvaluadorTrimestre = [...groupRowsBy(rows, (row) => row.evaluator).entries()]
        .map(([evaluador, evaluatorRows]) => {
            const trimestres = [...new Set(evaluatorRows.map((row) => quarterOf(evaluationDate(row))))].sort();
            return {
                evaluador,
                porTrimestre: trimestres.map((trimestre) => ({
                    trimestre,
                    valor: scoreValue(evaluatorRows.filter((row) => quarterOf(evaluationDate(row)) === trimestre)),
                })),
                total: scoreValue(evaluatorRows),
            };
        })
        .sort((a, b) => a.evaluador.localeCompare(b.evaluador));

    const comentarios = rows.flatMap((row) =>
        (row.respuestas || [])
            .filter((r) => r.answer && typeof SurveyScoring.asignarPuntaje(r.answer) !== 'number')
            .map((r) => ({ evaluado: row.evaluated, evaluador: row.evaluator, texto: r.answer }))
    );

    return { months, porEvaluado, porEvaluadorMensual, porEvaluadorTrimestre, comentarios };
}

module.exports = {
    MESES,
    round2,
    average,
    evaluationDate,
    evaluationScore,
    yateName,
    matchesYate,
    compliancePercent,
    quarterOf,
    scoreValue,
    complianceValue,
    monthlySeriesByYear,
    loadEvaluations,
    buildCargoMap,
    getOverview,
    getYates,
    getPersonas,
};
