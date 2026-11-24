const Bono = require('../../services/reports/bonoDesempeno.services');
const AppError = require('../../errors/AppError');
const { createReport, newSheet, writeTable, writeKpis, sendWorkbook, stamp: nowStamp, FIRST_ROW } = require('../../utils/excelReport');

const KIND = { memo: 'Memo', reglamento: 'Incumplimiento de reglamento' };
const DOC_STATE = { expired: 'Vencido', pending: 'Pendiente' };
const ROL = { capitan: 'Capitán', tripulante: 'Tripulante' };
// Ancho de cada columna de las tablas (para el banner y para estimar el alto de textos largos).
const widthsOf = (cols) => cols.map((c) => c.width);
const scoreTone = (min) => (value) => (typeof value === 'number' ? (value >= min ? 'ok' : 'warn') : null);

const generateBonoExcel = async (req, res, next) => {
    try {
        const { anio, semestre, staffId } = req.query;
        const data = await Bono.getCumplimiento({ anio, semestre, withDetail: true });
        const personas = staffId ? data.personas.filter((p) => String(p.staffId) === String(staffId)) : data.personas;
        if (!personas.length) throw new AppError('Sin datos del bono para esa selección', 404);

        const min = data.minScore;
        const [q1, q2] = personas[0].trimestres.map((t) => t.trimestre);
        const alcance = staffId ? personas[0].nombre : 'Reporte general';
        const sem = data.semestre === 1 ? '1er semestre (T1 + T2)' : '2do semestre (T3 + T4)';
        const stamp = nowStamp();
        const score = { kind: 'score', tone: scoreTone(min) };
        const head = (extra) => ({
            subtitle: `${alcance} · Año ${data.anio} · ${sem}`,
            meta: `Generado el ${stamp} · Nota mínima ${min} · Documentos al 100 % · Sin memos · Presente todo el año${extra ? ` · ${extra}` : ''}`,
        });

        const { wb, st } = createReport();

        // --- Resumen: franja de KPIs y tabla debajo
        const resCols = [
            { title: 'Persona', width: 30 }, { title: 'Rol', width: 13, kind: 'center' }, { title: 'Fecha de ingreso', width: 15, kind: 'date' },
            { title: 'Todo el año', width: 11, kind: 'yn' }, { title: `Nota ${q1}`, width: 10, ...score }, { title: `Nota ${q2}`, width: 10, ...score },
            { title: 'Nota semestre', width: 12, ...score }, { title: 'Documentos al día', width: 13, kind: 'pct' },
            { title: 'Memos / incumpl.', width: 12, kind: 'center' }, { title: 'Apto al bono', width: 12, kind: 'yn' }, { title: 'Motivos', width: 70 },
        ];
        const resumen = newSheet(wb, st, { name: 'Resumen', title: 'Cumplimiento del bono de desempeño', ...head(), widths: widthsOf(resCols), footer: 'Cumplimiento del bono de desempeño' });
        const aptos = personas.filter((p) => p.apto).length;
        const notas = personas.map((p) => p.nota).filter((n) => typeof n === 'number');
        const promedio = notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100 : 0;
        const tableRow = writeKpis(resumen, st, FIRST_ROW, [
            { label: 'Evaluados', value: personas.length },
            { label: 'Aptos al bono', value: aptos },
            { label: 'No aptos', value: personas.length - aptos },
            { label: 'Nota promedio', value: promedio, kind: 'score' },
        ]);
        writeTable(resumen, st, tableRow, resCols, personas.map((p) => [
            p.nombre, ROL[p.rol], p.fechaIngreso, p.todoElAnio ? 'Sí' : 'No', p.trimestres[0].valor, p.trimestres[1].valor, p.nota,
            p.documentos.porcentaje, p.incidencias.length, p.apto ? 'Sí' : 'No', p.razones.join(' | ') || 'Cumple todos los criterios',
        ]));

        // --- Evaluaciones
        const evCols = [
            { title: 'Persona', width: 30 }, { title: 'Rol', width: 13, kind: 'center' }, { title: 'Criterio', width: 34 }, { title: 'Pondera', width: 16, kind: 'center' },
            { title: 'Trimestre', width: 10, kind: 'center' }, { title: 'Fecha', width: 12, kind: 'date' }, { title: 'Evaluó', width: 28 }, { title: 'Formulario', width: 34 },
            { title: 'Yate', width: 20 }, { title: 'Empresa', width: 20 }, { title: 'Semana', width: 14, kind: 'center' }, { title: 'Puntaje', width: 10, ...score }, { title: 'Comentario', width: 50 },
        ];
        const ev = newSheet(wb, st, { name: 'Evaluaciones', title: 'Detalle de evaluaciones', ...head('Hotelería es informativa (no pondera)'), widths: widthsOf(evCols), footer: 'Cumplimiento del bono de desempeño' });
        writeTable(ev, st, FIRST_ROW, evCols, personas.flatMap((p) => p.evaluaciones.map((e) => [
            p.nombre, ROL[p.rol], e.label, p.criterios.find((c) => c.key === e.criterio)?.informativo ? 'No (informativo)' : 'Sí',
            e.trimestre, e.fecha, e.evaluador, e.formulario, e.yate, e.empresa, e.semana, e.puntaje, e.comentario,
        ])), { emptyText: 'Sin evaluaciones en el semestre' });

        // --- Respuestas
        const rsCols = [
            { title: 'Persona', width: 30 }, { title: 'Criterio', width: 34 }, { title: 'Fecha', width: 12, kind: 'date' }, { title: 'Evaluó', width: 28 },
            { title: 'Pregunta', width: 60 }, { title: 'Respuesta', width: 28 }, { title: 'Puntaje', width: 10, ...score },
        ];
        const rs = newSheet(wb, st, { name: 'Respuestas', title: 'Respuestas por pregunta', ...head(), widths: widthsOf(rsCols), footer: 'Cumplimiento del bono de desempeño' });
        writeTable(rs, st, FIRST_ROW, rsCols, personas.flatMap((p) => p.evaluaciones.flatMap((e) => e.respuestas.map((r) => [
            p.nombre, e.label, e.fecha, e.evaluador, r.pregunta, r.respuesta, typeof r.puntaje === 'number' ? r.puntaje : null,
        ]))), { emptyText: 'Sin respuestas registradas' });

        // --- Memos y documentos
        const mdCols = [{ title: 'Persona', width: 30 }, { title: 'Tipo', width: 32 }, { title: 'Fecha / estado', width: 18, kind: 'center' }, { title: 'Detalle', width: 70 }];
        const md = newSheet(wb, st, { name: 'Memos y documentos', title: 'Memos, incumplimientos y documentos pendientes', ...head(), widths: widthsOf(mdCols), footer: 'Cumplimiento del bono de desempeño' });
        writeTable(md, st, FIRST_ROW, mdCols, personas.flatMap((p) => [
            ...p.incidencias.map((i) => [p.nombre, KIND[i.kind] ?? i.kind, i.date, i.description]),
            ...p.documentos.pendientes.map((d) => [p.nombre, 'Documento pendiente', DOC_STATE[d.estado] ?? d.estado, d.nombre]),
        ]), { emptyText: 'Sin memos ni documentos pendientes' });

        const name = staffId ? personas[0].nombre.replace(/[^\w]+/g, '_') : 'general';
        await sendWorkbook(res, wb, `bono_${data.anio}_S${data.semestre}_${name}.xlsx`);
    } catch (error) {
        next(error);
    }
};

module.exports = { generateBonoExcel };
