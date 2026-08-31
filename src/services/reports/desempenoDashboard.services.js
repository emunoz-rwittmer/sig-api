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
};
