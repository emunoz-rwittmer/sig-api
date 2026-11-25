const ComentCardService = require("../../services/operations/comentCard/comentCard.services");
const Utils = require("../../utils/Utils");
const AppError = require("../../errors/AppError");
const Yacht = require('../../models/catalogs/yacht.models');
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

const generateReportComentCards = async (req, res, next) => {
    try {
        const yachtId = decodeId(req.params.yacht_id, 'yacht_id');
        const { startDate, endDate } = req.query;

        const result = await ComentCardService.getReportingByYacht(yachtId, startDate, endDate);
        if (!result || result.length === 0) {
            throw new AppError('No hay registros.', 400);
        }
        const yacht = yachtId
            ? await Yacht.findByPk(yachtId, { attributes: ['name'], include: [{ model: Company, as: 'company', attributes: ['logo'] }] })
            : null;

        // Una columna por pregunta, en el orden en que aparecen.
        const questions = [];
        result.forEach((entry) => {
            (entry.respuestas || []).forEach((r) => {
                if (r.pregunta?.id && !questions.some((q) => q.id === r.pregunta.id)) {
                    questions.push({ id: r.pregunta.id, title: r.pregunta.title });
                }
            });
        });

        const baseCols = [
            { title: 'Código crucero', kind: 'mono' }, { title: 'Crucero' }, { title: 'Yate' }, { title: 'Pasajero', kind: 'strong' },
            { title: 'Cabina', kind: 'center' }, { title: 'Fecha contestación', kind: 'date' },
            { title: 'Inicio crucero', kind: 'day' }, { title: 'Fin crucero', kind: 'day' },
        ];
        const cols = [...baseCols, ...questions.map((q) => ({ title: q.title || 'Pregunta' }))];
        const rows = result.map((item) => [
            item.coment_card?.code || '',
            item.coment_card?.name || '',
            item.coment_card?.card_yacht?.yate?.name || '',
            item.fullName || '',
            item.cabin ?? '',
            item.createdAt,
            item.coment_card?.startDate,
            item.coment_card?.endDate,
            ...questions.map((q) => {
                const answer = item.respuestas?.find((r) => r.pregunta?.id === q.id)?.answer;
                return answer === undefined || answer === null ? 'Sin respuesta' : answer;
            }),
        ]);

        const periodo = formatPeriod(startDate, endDate);
        const { wb, st } = createReport();
        const ws = newSheet(wb, st, {
            name: 'Comment cards',
            title: 'Reporte de comment cards',
            subtitle: `${yacht?.name || 'Todos los yates'} · ${periodo}`,
            meta: `Generado el ${stamp()}`,
            widths: [30, 28, 18, 28, 9, 14, 14, 14, ...questions.map(() => 36)],
            logo: yacht?.company?.logo,
            footer: 'Reporte de comment cards',
        });
        const next = writeKpis(ws, st, FIRST_ROW, [
            { label: 'Comment cards', value: result.length },
            { label: 'Cruceros', value: new Set(result.map((item) => item.coment_card?.code).filter(Boolean)).size },
            { label: 'Preguntas', value: questions.length },
        ]);
        writeTable(ws, st, next, cols, rows);

        await sendWorkbook(res, wb, `comment_cards_${fileStamp()}.xlsx`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateReportComentCards,
};
