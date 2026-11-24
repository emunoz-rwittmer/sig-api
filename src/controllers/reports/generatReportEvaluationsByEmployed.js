const AppError = require('../../errors/AppError');
const { createReport, newSheet, writeKpis, writeTable, sendWorkbook, stamp, fileStamp, formatPeriod, FIRST_ROW } = require('../../utils/excelReport');

const fullName = (person, first = 'firstName', last = 'lastName') =>
    [person?.[first], person?.[last]].filter(Boolean).join(' ') || 'Sin asignar';

const generatReportEvaluationsByEmployed = async (req, res, next) => {
    try {
        const { reportingEvaluationsByCrewState, dataForReport } = req.body;

        if (!Array.isArray(dataForReport?.averageReviews)) {
            throw new AppError('dataForReport.averageReviews es requerido', 400);
        }

        const crew = reportingEvaluationsByCrewState?.crew;
        const evaluado = fullName(crew, 'first_name', 'last_name');
        const reviews = dataForReport.averageReviews;
        const average = Number(dataForReport.averageGeneral);
        const periodo = formatPeriod(dataForReport.startDate, dataForReport.endDate);

        const { wb, st } = createReport();
        const ws = newSheet(wb, st, {
            name: 'Evaluaciones',
            title: 'Reporte de desempeño por colaborador',
            subtitle: `${evaluado} · ${crew?.staff_position?.name || 'Sin cargo'}`,
            meta: `Periodo ${periodo} · Generado el ${stamp()}`,
            widths: [30, 22, 30, 16, 14],
            footer: `Desempeño de ${evaluado}`,
        });
        const next = writeKpis(ws, st, FIRST_ROW, [
            { label: 'Evaluaciones', value: reviews.length },
            { label: 'Puntuación promedio', value: Number.isFinite(average) ? average : '—', kind: 'score' },
        ]);
        writeTable(ws, st, next, [
            { title: 'Fecha', kind: 'date' }, { title: 'Yate' }, { title: 'Evaluador' },
            { title: 'Estado', kind: 'center' }, { title: 'Calificación', kind: 'score' },
        ], reviews.map((evaluation) => [
            evaluation.createdAt,
            evaluation.header_yacht?.name || 'Sin asignar',
            fullName(evaluation.header_evaluator),
            evaluation.state?.state || 'Sin asignar',
            evaluation.promedio,
        ]), { emptyText: 'Sin evaluaciones en el periodo' });

        const name = evaluado.replace(/[^\w]+/g, '_');
        await sendWorkbook(res, wb, `desempeno_${name}_${fileStamp()}.xlsx`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generatReportEvaluationsByEmployed,
};
