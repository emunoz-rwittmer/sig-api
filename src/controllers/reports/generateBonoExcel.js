const fs = require('fs');
const path = require('path');
const xl = require('excel4node');
const Bono = require('../../services/reports/bonoDesempeno.services');
const AppError = require('../../errors/AppError');

const KIND = { memo: 'Memo', reglamento: 'Incumplimiento de reglamento' };
const DOC_STATE = { expired: 'Vencido', pending: 'Pendiente' };
const ROL = { capitan: 'Capitán', tripulante: 'Tripulante' };
const LOGO = path.join(__dirname, '../../../uploads/companies/logo_rwittmer.png');

// Paleta del design system del frontend (igual que el reporte de transacciones).
const C = { navy: '0B2A45', teal: '0F6E8C', muted: '5A6E7D', border: 'DDE4EA', head: 'F1F4F7', zebra: 'F7F9FB', white: 'FFFFFF', ok: '15803D', okBg: 'E7F6EC', bad: 'B91C1C', badBg: 'FDECEC', warn: 'B45309' };
const thin = { style: 'thin', color: C.border };
const BORDER = { left: thin, right: thin, top: thin, bottom: thin };
const solid = (color) => ({ type: 'pattern', patternType: 'solid', fgColor: color });
const SHEET_OPTIONS = {
    sheetView: { showGridLines: false },
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 },
    sheetFormat: { defaultRowHeight: 16 },
    headerFooter: { oddFooter: '&L&8Rolf Wittmer SIG - Cumplimiento bono de desempeño&R&8Página &P de &N' },
};
// Columna A de 30 + filas 1-3 de 26/18/18.6 pt = caja de ~215x83 px, la proporción del logo (2.58:1).
const LOGO_COL_WIDTH = 30;
const FIRST_TABLE_ROW = 6;

function createStyles(wb) {
    const font = (extra = {}) => ({ name: 'Calibri', size: 10, color: C.navy, ...extra });
    const mid = { vertical: 'center' };
    const cell = (extra = {}) => wb.createStyle({ font: font(), border: BORDER, alignment: { ...mid, wrapText: true }, ...extra });
    const centered = { horizontal: 'center', ...mid, wrapText: true };
    return {
        title: wb.createStyle({ font: font({ size: 18, bold: true }), alignment: { ...mid, indent: 1 } }),
        subtitle: wb.createStyle({ font: font({ size: 11, bold: true, color: C.teal }), alignment: { ...mid, indent: 1 } }),
        meta: wb.createStyle({ font: font({ size: 9, color: C.muted }), alignment: { ...mid, indent: 1 } }),
        bar: wb.createStyle({ fill: solid(C.teal) }),
        header: wb.createStyle({ font: font({ bold: true, color: C.white }), fill: solid(C.navy), border: BORDER, alignment: centered }),
        kpiLabel: wb.createStyle({ font: font({ size: 9, bold: true, color: C.muted }), fill: solid(C.head), border: BORDER, alignment: centered }),
        kpiValue: wb.createStyle({ font: font({ size: 16, bold: true }), border: BORDER, alignment: centered }),
        text: cell(),
        textZ: cell({ fill: solid(C.zebra) }),
        center: cell({ alignment: centered }),
        centerZ: cell({ fill: solid(C.zebra), alignment: centered }),
        date: cell({ numberFormat: 'dd/mm/yyyy', alignment: centered }),
        dateZ: cell({ numberFormat: 'dd/mm/yyyy', fill: solid(C.zebra), alignment: centered }),
        pct: cell({ numberFormat: '0"%"', alignment: centered }),
        pctZ: cell({ numberFormat: '0"%"', fill: solid(C.zebra), alignment: centered }),
        scoreOk: cell({ numberFormat: '0.00', font: font({ bold: true, color: C.ok }), alignment: centered }),
        scoreLow: cell({ numberFormat: '0.00', font: font({ bold: true, color: C.warn }), alignment: centered }),
        yes: cell({ font: font({ bold: true, color: C.ok }), fill: solid(C.okBg), alignment: centered }),
        no: cell({ font: font({ bold: true, color: C.bad }), fill: solid(C.badBg), alignment: centered }),
        note: wb.createStyle({ font: font({ italic: true, color: C.muted }), alignment: centered }),
    };
}

// Hoja con banner: logo a la izquierda, título/subtítulo/meta a su derecha y barra teal.
function newSheet(wb, st, { name, title, subtitle, meta, lastCol }) {
    const ws = wb.addWorksheet(name, SHEET_OPTIONS);
    [26, 18, 18.6, 4, 8].forEach((h, i) => ws.row(i + 1).setHeight(h));
    ws.cell(1, 2, 1, lastCol, true).string(title).style(st.title);
    ws.cell(2, 2, 2, lastCol, true).string(subtitle).style(st.subtitle);
    ws.cell(3, 2, 3, lastCol, true).string(meta).style(st.meta);
    ws.cell(4, 1, 4, lastCol, true).style(st.bar);
    // El logo vive en uploads/ (fuera de git): si falta en el servidor, el reporte sale sin él.
    if (fs.existsSync(LOGO)) {
        ws.addImage({ path: LOGO, type: 'picture', position: { type: 'twoCellAnchor', from: { col: 1, colOff: 0, row: 1, rowOff: 0 }, to: { col: 2, colOff: 0, row: 4, rowOff: 0 } } });
    }
    return ws;
}

const toDate = (iso) => (iso ? new Date(`${iso}T12:00:00`) : null);

// cols: { title, width, kind }  kind: text | center | date | score | pct | yn
function writeTable(ws, st, startRow, cols, rows, { minScore, emptyText = 'Sin registros' } = {}) {
    cols.forEach((c, i) => {
        ws.column(i + 1).setWidth(i === 0 ? LOGO_COL_WIDTH : c.width);
        ws.cell(startRow, i + 1).string(c.title).style(st.header);
    });
    ws.row(startRow).setHeight(30);
    if (!rows.length) {
        ws.cell(startRow + 1, 1, startRow + 1, cols.length, true).string(emptyText).style(st.note);
        return;
    }
    rows.forEach((r, ri) => {
        const z = ri % 2 === 1;
        // Excel no autoajusta filas con texto envuelto al abrir un archivo generado: se estima por caracteres por línea.
        const lines = Math.max(...r.map((v, ci) => (typeof v === 'string' && !['date', 'yn'].includes(cols[ci].kind) ? Math.ceil(v.length / (cols[ci].width * 1.05)) : 1)));
        if (lines > 1) ws.row(startRow + 1 + ri).setHeight(lines * 13 + 4);
        r.forEach((v, ci) => {
            const cell = ws.cell(startRow + 1 + ri, ci + 1);
            const kind = cols[ci].kind || 'text';
            const dash = () => cell.string('—').style(z ? st.centerZ : st.center);
            if (kind === 'date') {
                const d = toDate(v);
                if (d) cell.date(d).style(z ? st.dateZ : st.date); else dash();
            } else if (kind === 'score') {
                if (typeof v === 'number') cell.number(v).style(v >= minScore ? st.scoreOk : st.scoreLow); else dash();
            } else if (kind === 'pct') {
                cell.number(v).style(z ? st.pctZ : st.pct);
            } else if (kind === 'yn') {
                cell.string(v).style(v === 'Sí' ? st.yes : st.no);
            } else {
                const style = kind === 'center' ? (z ? st.centerZ : st.center) : (z ? st.textZ : st.text);
                if (typeof v === 'number') cell.number(v).style(style); else cell.string(v === null || v === undefined ? '' : String(v)).style(style);
            }
        });
    });
    ws.row(startRow).freeze();
    ws.row(startRow).filter({ firstColumn: 1, lastColumn: cols.length });
}

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
        const now = new Date();
        const stamp = `${now.toLocaleDateString('es-EC')} ${now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`;
        const head = (extra) => ({
            subtitle: `${alcance} · Año ${data.anio} · ${sem}`,
            meta: `Generado el ${stamp} · Nota mínima ${min} · Documentos al 100 % · Sin memos · Presente todo el año${extra ? ` · ${extra}` : ''}`,
        });

        const wb = new xl.Workbook({ defaultFont: { name: 'Calibri', size: 10 }, author: 'Rolf Wittmer SIG' });
        const st = createStyles(wb);

        // --- Resumen: franja de KPIs (filas 6-7) y tabla desde la fila 9
        const resCols = [
            { title: 'Persona', width: 30 }, { title: 'Rol', width: 13, kind: 'center' }, { title: 'Fecha de ingreso', width: 15, kind: 'date' },
            { title: 'Todo el año', width: 11, kind: 'yn' }, { title: `Nota ${q1}`, width: 10, kind: 'score' }, { title: `Nota ${q2}`, width: 10, kind: 'score' },
            { title: 'Nota semestre', width: 12, kind: 'score' }, { title: 'Documentos al día', width: 13, kind: 'pct' },
            { title: 'Memos / incumpl.', width: 12, kind: 'center' }, { title: 'Apto al bono', width: 12, kind: 'yn' }, { title: 'Motivos', width: 70 },
        ];
        const resumen = newSheet(wb, st, { name: 'Resumen', title: 'Cumplimiento del bono de desempeño', ...head(), lastCol: resCols.length });
        const aptos = personas.filter((p) => p.apto).length;
        const notas = personas.map((p) => p.nota).filter((n) => typeof n === 'number');
        const promedio = notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100 : 0;
        [['EVALUADOS', personas.length], ['APTOS AL BONO', aptos], ['NO APTOS', personas.length - aptos], ['NOTA PROMEDIO', promedio]].forEach(([label, value], i) => {
            const [c1, c2] = i === 0 ? [1, 1] : [2 * i, 2 * i + 1]; // la col. A (logo) lleva un KPI; el resto, pares de columnas
            const merge = c1 !== c2;
            resumen.cell(FIRST_TABLE_ROW, c1, FIRST_TABLE_ROW, c2, merge).string(label).style(st.kpiLabel);
            resumen.cell(FIRST_TABLE_ROW + 1, c1, FIRST_TABLE_ROW + 1, c2, merge).number(value).style(st.kpiValue);
        });
        resumen.row(FIRST_TABLE_ROW + 1).setHeight(28);
        resumen.row(FIRST_TABLE_ROW + 2).setHeight(8);
        writeTable(resumen, st, FIRST_TABLE_ROW + 3, resCols, personas.map((p) => [
            p.nombre, ROL[p.rol], p.fechaIngreso, p.todoElAnio ? 'Sí' : 'No', p.trimestres[0].valor, p.trimestres[1].valor, p.nota,
            p.documentos.porcentaje, p.incidencias.length, p.apto ? 'Sí' : 'No', p.razones.join(' | ') || 'Cumple todos los criterios',
        ]), { minScore: min });

        // --- Evaluaciones
        const evCols = [
            { title: 'Persona', width: 30 }, { title: 'Rol', width: 13, kind: 'center' }, { title: 'Criterio', width: 34 }, { title: 'Pondera', width: 16, kind: 'center' },
            { title: 'Trimestre', width: 10, kind: 'center' }, { title: 'Fecha', width: 12, kind: 'date' }, { title: 'Evaluó', width: 28 }, { title: 'Formulario', width: 34 },
            { title: 'Yate', width: 20 }, { title: 'Empresa', width: 20 }, { title: 'Semana', width: 14, kind: 'center' }, { title: 'Puntaje', width: 10, kind: 'score' }, { title: 'Comentario', width: 50 },
        ];
        const ev = newSheet(wb, st, { name: 'Evaluaciones', title: 'Detalle de evaluaciones', ...head('Hotelería es informativa (no pondera)'), lastCol: evCols.length });
        writeTable(ev, st, FIRST_TABLE_ROW, evCols, personas.flatMap((p) => p.evaluaciones.map((e) => [
            p.nombre, ROL[p.rol], e.label, p.criterios.find((c) => c.key === e.criterio)?.informativo ? 'No (informativo)' : 'Sí',
            e.trimestre, e.fecha, e.evaluador, e.formulario, e.yate, e.empresa, e.semana, e.puntaje, e.comentario,
        ])), { minScore: min, emptyText: 'Sin evaluaciones en el semestre' });

        // --- Respuestas
        const rsCols = [
            { title: 'Persona', width: 30 }, { title: 'Criterio', width: 34 }, { title: 'Fecha', width: 12, kind: 'date' }, { title: 'Evaluó', width: 28 },
            { title: 'Pregunta', width: 60 }, { title: 'Respuesta', width: 28 }, { title: 'Puntaje', width: 10, kind: 'score' },
        ];
        const rs = newSheet(wb, st, { name: 'Respuestas', title: 'Respuestas por pregunta', ...head(), lastCol: rsCols.length });
        writeTable(rs, st, FIRST_TABLE_ROW, rsCols, personas.flatMap((p) => p.evaluaciones.flatMap((e) => e.respuestas.map((r) => [
            p.nombre, e.label, e.fecha, e.evaluador, r.pregunta, r.respuesta, typeof r.puntaje === 'number' ? r.puntaje : null,
        ]))), { minScore: min, emptyText: 'Sin respuestas registradas' });

        // --- Memos y documentos
        const mdCols = [{ title: 'Persona', width: 30 }, { title: 'Tipo', width: 32 }, { title: 'Fecha / estado', width: 18, kind: 'center' }, { title: 'Detalle', width: 70 }];
        const md = newSheet(wb, st, { name: 'Memos y documentos', title: 'Memos, incumplimientos y documentos pendientes', ...head(), lastCol: mdCols.length });
        writeTable(md, st, FIRST_TABLE_ROW, mdCols, personas.flatMap((p) => [
            ...p.incidencias.map((i) => [p.nombre, KIND[i.kind] ?? i.kind, i.date, i.description]),
            ...p.documentos.pendientes.map((d) => [p.nombre, 'Documento pendiente', DOC_STATE[d.estado] ?? d.estado, d.nombre]),
        ]), { minScore: min, emptyText: 'Sin memos ni documentos pendientes' });

        const name = staffId ? personas[0].nombre.replace(/[^\w]+/g, '_') : 'general';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=bono_${data.anio}_S${data.semestre}_${name}.xlsx`);
        res.status(200).send(await wb.writeToBuffer());
    } catch (error) {
        next(error);
    }
};

module.exports = { generateBonoExcel };
