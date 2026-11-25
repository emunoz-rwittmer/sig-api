const EvaluationService = require('../../services/operations/surveys/evaluations.services');
const Utils = require('../../utils/Utils');
const SurveyScoring = require('../../utils/surveyScoring');
const AppError = require('../../errors/AppError');
const Staffervice = require('../../services/catalogs/staff.services');
const { extractApellido, capitalizeYachtName, extractNombres } = require('../../utils/reportFormatting');
const Company = require('../../models/catalogs/company.models');
const { createReport, newSheet, writeKpis, writeTable, sendWorkbook, stamp, fileStamp, formatPeriod, FIRST_ROW } = require('../../utils/excelReport');

const decodeId = (value, fieldName) => {
    if (!value || value === 'undefined' || value === 'null' || value === 'all') {
        return undefined;
    }
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const QUESTION_COUNT = 10;

const generateGeneralReportEvaluations = async (req, res, next) => {
    try {
        const companyId = decodeId(req.params.company_id, 'company_id');
        const { startDate, endDate } = req.query;

        const result = await EvaluationService.getEvaluationsByCompany(companyId, startDate, endDate);
        if (!result || result.length === 0) {
            throw new AppError('No hay registros.', 400);
        }
        const company = companyId ? await Company.findByPk(companyId, { attributes: ['name', 'logo'] }) : null;

        // === CARGO DEL EVALUADO (una sola consulta batch, nombre+apellido) ===
        const uniqueEvaluados = [...new Set(result.map(item => item.evaluated).filter(Boolean))];
        const namePairs = uniqueEvaluados
            .map(evaluado => ({ fullName: evaluado, firstName: extractNombres(evaluado), lastName: extractApellido(evaluado) }))
            .filter(({ firstName, lastName }) => firstName && lastName);
        const cargoByFullName = await Staffervice.getPositionsByFullNames(
            namePairs.map(({ firstName, lastName }) => ({ firstName, lastName }))
        );
        const cargoMap = new Map(namePairs.map(({ fullName, firstName, lastName }) => [
            fullName,
            cargoByFullName.get(`${firstName} ${lastName}`) || null,
        ]));

        const cols = [
            { title: 'Formulario' }, { title: 'Evaluador' }, { title: 'Evaluado', kind: 'strong' }, { title: 'Cargo' },
            { title: 'Yate' }, { title: 'Fecha', kind: 'date' }, { title: 'Estado', kind: 'center' },
            ...Array.from({ length: QUESTION_COUNT }, (_, i) => ({ title: `Pregunta ${i + 1}`, kind: 'center' })),
        ];
        const rows = result.map((item) => {
            // Respuestas en el orden del formulario: número si puntúa, texto si es abierta.
            const respuestas = item.respuestas?.map(r => SurveyScoring.asignarPuntaje(r.answer)) || [];
            return [
                item.formulario?.name || 'Sin Datos',
                item.evaluator,
                item.evaluated,
                cargoMap.get(item.evaluated) || 'Sin Datos',
                capitalizeYachtName(item.empresa?.yacht?.name) || 'N/A',
                item.updatedAt,
                item.state || 'Sin Datos',
                ...Array.from({ length: QUESTION_COUNT }, (_, i) => respuestas[i] ?? null),
            ];
        });

        const periodo = formatPeriod(startDate, endDate);
        const { wb, st } = createReport();
        const ws = newSheet(wb, st, {
            name: 'Reporte general',
            title: 'Reporte general de desempeño',
            subtitle: `${company?.name || 'Todas las empresas'} · ${periodo}`,
            meta: `Generado el ${stamp()} · Respuestas puntuadas de 1 a 5; las abiertas se muestran como texto`,
            widths: [34, 28, 30, 22, 16, 12, 14, ...Array(QUESTION_COUNT).fill(14)],
            logo: company?.logo,
            footer: 'Reporte general de desempeño',
        });
        const next = writeKpis(ws, st, FIRST_ROW, [
            { label: 'Evaluaciones', value: result.length },
            { label: 'Personas evaluadas', value: uniqueEvaluados.length },
            { label: 'Evaluadores', value: new Set(result.map((item) => item.evaluator).filter(Boolean)).size },
            { label: 'Formularios', value: new Set(result.map((item) => item.formulario?.name).filter(Boolean)).size },
        ]);
        writeTable(ws, st, next, cols, rows);

        await sendWorkbook(res, wb, `reporte_evaluaciones_${fileStamp()}.xlsx`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateGeneralReportEvaluations,
}