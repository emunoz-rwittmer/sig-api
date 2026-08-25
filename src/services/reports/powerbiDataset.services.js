const EvaluationService = require('../operations/surveys/evaluations.services');
const Staffervice = require('../catalogs/staff.services');
const SurveyScoring = require('../../utils/surveyScoring');
const { extractApellido, capitalizeYachtName, extractNombres } = require('../../utils/reportFormatting');

async function getEvaluationsDatasetRows() {
    const result = await EvaluationService.getEvaluationsByCompany(undefined, undefined, undefined);

    const uniqueEvaluados = [...new Set(result.map((item) => item.evaluated).filter(Boolean))];
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
    const cargoMap = new Map(
        namePairs.map(({ fullName, firstName, lastName }) => [
            fullName,
            cargoByFullName.get(`${firstName} ${lastName}`) || null,
        ])
    );

    return result.map((item) => {
        const respuestas = item.respuestas?.map((r) => SurveyScoring.asignarPuntaje(r.answer)) || [];
        const row = {
            formulario: item.formulario?.name || 'Sin Datos',
            evaluador: item.evaluator,
            evaluado: item.evaluated,
            cargo: cargoMap.get(item.evaluated) || 'Sin Datos',
            yate: capitalizeYachtName(item.empresa?.yacht?.name) || 'N/A',
            fecha: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
            estado: item.state || 'Sin Datos',
        };
        for (let i = 0; i < 10; i += 1) {
            const respuesta = respuestas[i];
            row[`pregunta${i + 1}`] = (respuesta === undefined || respuesta === '') ? null : respuesta;
        }
        return row;
    });
}

module.exports = { getEvaluationsDatasetRows };
