// Molde único de los reportes Excel (excel4node): banner con logo, título, subtítulo y
// metadatos, barra teal, tablas con encabezado fijo y autofiltro, filas alternadas,
// formatos numéricos reales y pie con número de página. Salió del reporte del bono.
const fs = require('fs');
const path = require('path');
const xl = require('excel4node');
const imageSize = require('image-size');
const { formatReportDate, formatReportTime } = require('./transactionMovements');

// Paleta del design system del frontend (docs/CONVENTIONS.md §1 en interno-react).
const C = {
    navy: '0B2A45', teal: '0F6E8C', muted: '5A6E7D', label: '7A8B99', border: 'DDE4EA',
    head: 'F1F4F7', zebra: 'F7F9FB', white: 'FFFFFF', total: 'E2E8EE',
};
// Celdas de estado: color de letra + fondo suave.
const TONES = {
    ok: ['15803D', 'E7F6EC'],
    bad: ['B91C1C', 'FDECEC'],
    warn: ['B45309', 'FFF4E5'],
    info: ['0F6E8C', 'E8F4F8'],
    neutral: ['64748B', 'F1F4F7'],
    violet: ['6D28D9', 'F3EEFC'],
};
// Tono de cada tipo de movimiento de inventario (mismos colores que la pantalla).
const MOVEMENT_TONES = { ENTRY: 'ok', TRANSFER: 'info', EXIT: 'warn', BAR_CONSUMPTION: 'violet', ADJUST: 'neutral' };
const FORMATS = {
    date: 'dd/mm/yyyy',
    day: 'dd/mm/yyyy',
    datetime: 'dd/mm/yyyy hh:mm',
    int: '#,##0',
    number: '#,##0.00',
    money: '"$"#,##0.00',
    pct: '0"%"', // valor 0-100
    ratio: '0%', // valor 0-1
    score: '0.00',
};
const NUMERIC = new Set(['int', 'number', 'money', 'pct', 'ratio', 'score']);
const CENTERED = new Set(['center', 'date', 'day', 'datetime', 'yn', 'pct', 'ratio', 'score', 'mono']);

const ROOT = path.join(__dirname, '../..');
const DEFAULT_LOGO = path.join(ROOT, 'uploads/companies/logo_rwittmer.png');
const LOGO_COL_WIDTH = 30;
// Filas 1-3 del banner (26 + 18 + 18.6 pt) = 83 px de alto; la columna A de 30 = ~215 px.
const LOGO_BOX = { width: 200, height: 70 };
const FIRST_ROW = 6;
const EC_OFFSET_MS = 5 * 60 * 60 * 1000; // Ecuador continental, UTC-5 sin horario de verano

const thin = { style: 'thin', color: C.border };
const BORDER = { left: thin, right: thin, top: thin, bottom: thin };
const solid = (color) => ({ type: 'pattern', patternType: 'solid', fgColor: color });

// `company.logo` se guarda como "/uploads/companies/x.png". Si no hay o no existe, va el de Rolf Wittmer.
function resolveLogo(logo) {
    const candidate = logo ? path.join(ROOT, logo) : null;
    if (candidate && fs.existsSync(candidate)) return candidate;
    return fs.existsSync(DEFAULT_LOGO) ? DEFAULT_LOGO : null;
}

// excel4node escribe las fechas en UTC. `date`/`datetime` son instantes (createdAt...) y se
// pasan a la hora de Ecuador. `day` es un día de calendario guardado a medianoche UTC (inicio
// de crucero, vencimientos) o un "YYYY-MM-DD": se toma su fecha UTC tal cual.
function toExcelDate(value, kind = 'date') {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    if (kind === 'day') return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return new Date(date.getTime() - EC_OFFSET_MS);
}

const isSetDate = (value) => value && value !== 'undefined' && value !== 'null';
// Día de calendario ("YYYY-MM-DD" o medianoche UTC) como dd/mm/yyyy, sin correrse por la zona horaria.
const formatDay = (value) => (isSetDate(value) && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toISOString().slice(0, 10).split('-').reverse().join('/') : '');
const formatPeriod = (start, end) => (isSetDate(start) && isSetDate(end) ? `${formatDay(start)} al ${formatDay(end)}` : 'Todo el historial');

const stamp = (date = new Date()) => `${formatReportDate(date)} ${formatReportTime(date)}`;
const fileStamp = (date = new Date()) => formatReportDate(date).split('/').reverse().join('');

function createReport() {
    const wb = new xl.Workbook({ defaultFont: { name: 'Calibri', size: 10, color: C.navy }, author: 'Rolf Wittmer SIG' });
    const font = (extra = {}) => ({ name: 'Calibri', size: 10, color: C.navy, ...extra });
    const mid = { vertical: 'center' };
    const centered = { horizontal: 'center', ...mid, wrapText: true };
    const cache = new Map();

    // Estilo de celda de tabla según tipo, fila alternada y tono; se crea una sola vez por combinación.
    const cell = (kind = 'text', zebra = false, tone = null) => {
        const key = `${kind}|${zebra && !tone}|${tone}`;
        if (!cache.has(key)) {
            const [toneFont, toneFill] = TONES[tone] || [];
            const horizontal = NUMERIC.has(kind) && !CENTERED.has(kind) ? 'right' : CENTERED.has(kind) ? 'center' : 'left';
            cache.set(key, wb.createStyle({
                font: font({
                    ...(kind === 'mono' ? { name: 'Consolas', size: 9.5 } : {}),
                    ...(kind === 'strong' || tone ? { bold: true } : {}),
                    ...(toneFont ? { color: toneFont } : {}),
                }),
                border: BORDER,
                alignment: { ...mid, horizontal, wrapText: true, ...(horizontal === 'center' ? {} : { indent: 1 }) },
                ...(FORMATS[kind] ? { numberFormat: FORMATS[kind] } : {}),
                ...(toneFill ? { fill: solid(toneFill) } : zebra ? { fill: solid(C.zebra) } : {}),
            }));
        }
        return cache.get(key);
    };

    const st = {
        cell,
        title: wb.createStyle({ font: font({ size: 18, bold: true }), alignment: { ...mid, indent: 1 } }),
        subtitle: wb.createStyle({ font: font({ size: 11, bold: true, color: C.teal }), alignment: { ...mid, indent: 1 } }),
        meta: wb.createStyle({ font: font({ size: 9, color: C.muted }), alignment: { ...mid, indent: 1 } }),
        bar: wb.createStyle({ fill: solid(C.teal) }),
        section: wb.createStyle({ font: font({ bold: true, color: C.teal }), border: { bottom: { style: 'medium', color: C.teal } } }),
        header: wb.createStyle({ font: font({ bold: true, color: C.white }), fill: solid(C.navy), border: BORDER, alignment: centered }),
        label: wb.createStyle({ font: font({ bold: true, color: C.muted }), fill: solid(C.head), border: BORDER, alignment: { ...mid, indent: 1 } }),
        value: wb.createStyle({ font: font(), border: BORDER, alignment: { ...mid, indent: 1, wrapText: true } }),
        kpiLabel: wb.createStyle({ font: font({ size: 9, bold: true, color: C.muted }), fill: solid(C.head), border: BORDER, alignment: centered }),
        kpiValue: wb.createStyle({ font: font({ size: 16, bold: true }), border: BORDER, alignment: centered }),
        total: (kind = 'text') => wb.createStyle({
            font: font({ bold: true }),
            fill: solid(C.total),
            border: { ...BORDER, top: { style: 'medium', color: C.navy } },
            alignment: { ...mid, horizontal: NUMERIC.has(kind) ? 'right' : 'left' },
            ...(FORMATS[kind] ? { numberFormat: FORMATS[kind] } : {}),
        }),
        note: wb.createStyle({ font: font({ italic: true, color: C.label }), alignment: centered }),
        footnote: wb.createStyle({ font: font({ size: 9, italic: true, color: C.label }) }),
    };
    return { wb, st };
}

function addLogo(ws, logoPath) {
    if (!logoPath) return;
    const { width, height } = imageSize(logoPath);
    const scale = Math.min(LOGO_BOX.width / width, LOGO_BOX.height / height);
    const picture = ws.addImage({
        path: logoPath,
        type: 'picture',
        position: { type: 'oneCellAnchor', from: { col: 1, colOff: '1.5mm', row: 1, rowOff: '1mm' } },
    });
    // excel4node toma el tamaño en px de la imagen; se reemplaza por el que cabe en la caja.
    picture._pxWidth = Math.round(width * scale);
    picture._pxHeight = Math.round(height * scale);
}

/**
 * Hoja con banner. `widths` fija los anchos de columna (la A nunca baja de 30 para el logo)
 * y define cuántas columnas ocupa el banner. El contenido empieza en FIRST_ROW.
 */
function newSheet(wb, st, { name, title, subtitle = '', meta = '', widths, logo, footer, portrait = false }) {
    const lastCol = Math.max(widths.length, 2);
    const ws = wb.addWorksheet(name.slice(0, 31), {
        sheetView: { showGridLines: false },
        pageSetup: { orientation: portrait ? 'portrait' : 'landscape', fitToWidth: 1, fitToHeight: 0, paperSize: 'A4_PAPER' },
        sheetFormat: { defaultRowHeight: 16 },
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6 },
        headerFooter: { oddFooter: `&L&8Rolf Wittmer SIG · ${footer || title}&R&8Página &P de &N` },
    });
    widths.forEach((width, i) => ws.column(i + 1).setWidth(i === 0 ? Math.max(width, LOGO_COL_WIDTH) : width));
    if (widths.length < 2) ws.column(2).setWidth(40);
    [26, 18, 18.6, 4, 8].forEach((h, i) => ws.row(i + 1).setHeight(h));
    ws.cell(1, 2, 1, lastCol, lastCol > 2).string(title).style(st.title);
    ws.cell(2, 2, 2, lastCol, lastCol > 2).string(subtitle).style(st.subtitle);
    ws.cell(3, 2, 3, lastCol, lastCol > 2).string(meta || `Generado el ${stamp()}`).style(st.meta);
    ws.cell(4, 1, 4, lastCol, true).style(st.bar);
    addLogo(ws, resolveLogo(logo));
    return ws;
}

function writeValue(cellRef, value, style, kind) {
    if (value === null || value === undefined || value === '') {
        return cellRef.string(NUMERIC.has(kind) || FORMATS[kind] ? '—' : '').style(style);
    }
    if (kind === 'date' || kind === 'day' || kind === 'datetime') {
        const date = toExcelDate(value, kind);
        return date ? cellRef.date(date).style(style) : cellRef.string(String(value)).style(style);
    }
    if (NUMERIC.has(kind) || typeof value === 'number') {
        const number = Number(value);
        if (Number.isFinite(number)) return cellRef.number(number).style(style);
    }
    return cellRef.string(String(value)).style(style);
}

/**
 * Tabla con encabezado navy, filas alternadas, encabezado fijo y autofiltro.
 * cols: { title, kind?, tone?(value, row), width? (ancho de la columna, para estimar el alto de textos largos) }  kind: text | strong | center | mono | date | datetime |
 *       int | number | money | pct | ratio | score | yn.   `tone` devuelve ok|bad|warn|info|neutral|violet.
 * rows: arreglos de valores en el orden de cols.
 * totals: arreglo del largo de cols con un texto, 'sum' (fórmula SUM) o null.
 * Devuelve la primera fila libre después de la tabla.
 */
function writeTable(ws, st, startRow, cols, rows, { emptyText = 'Sin registros', totals, freeze = true, filter = true } = {}) {
    cols.forEach((col, i) => ws.cell(startRow, i + 1).string(col.title).style(st.header));
    ws.row(startRow).setHeight(30);
    if (!rows.length) {
        ws.cell(startRow + 1, 1, startRow + 1, cols.length, cols.length > 1).string(emptyText).style(st.note);
        return startRow + 3;
    }
    rows.forEach((values, ri) => {
        const row = startRow + 1 + ri;
        // Excel no autoajusta el alto de filas con texto envuelto en un archivo generado: se estima
        // por caracteres por línea en las columnas que declaran `width`.
        const lines = Math.max(1, ...cols.map((col, ci) => (col.width && typeof values[ci] === 'string'
            ? Math.ceil(values[ci].length / (col.width * 1.05)) : 1)));
        if (lines > 1) ws.row(row).setHeight(lines * 13 + 4);
        cols.forEach((col, ci) => {
            const kind = col.kind || 'text';
            const tone = col.tone ? col.tone(values[ci], values) : kind === 'yn' ? (values[ci] === 'Sí' ? 'ok' : 'bad') : null;
            writeValue(ws.cell(row, ci + 1), values[ci], st.cell(kind, ri % 2 === 1, tone), kind);
        });
    });
    let next = startRow + rows.length + 1;
    if (totals) {
        const first = startRow + 1;
        totals.forEach((total, ci) => {
            const kind = cols[ci].kind || 'text';
            const ref = ws.cell(next, ci + 1);
            if (total === 'sum') {
                const letter = xl.getExcelAlpha(ci + 1);
                ref.formula(`SUM(${letter}${first}:${letter}${next - 1})`).style(st.total(kind));
            } else {
                writeValue(ref, total ?? '', st.total(typeof total === 'number' ? kind : 'text'), typeof total === 'number' ? kind : 'text');
            }
        });
        next += 1;
    }
    if (freeze) ws.row(startRow).freeze();
    if (filter) ws.row(startRow).filter({ firstRow: startRow, firstColumn: 1, lastRow: startRow + rows.length, lastColumn: cols.length });
    return next + 1;
}

// Franja de indicadores: la col. A (la del logo) lleva el primero y el resto ocupa pares de columnas.
function writeKpis(ws, st, row, items) {
    items.forEach(({ label, value, kind }, i) => {
        const [c1, c2] = i === 0 ? [1, 1] : [2 * i, 2 * i + 1];
        ws.cell(row, c1, row, c2, c1 !== c2).string(label.toUpperCase()).style(st.kpiLabel);
        const valueCell = ws.cell(row + 1, c1, row + 1, c2, c1 !== c2);
        if (typeof value === 'number') {
            valueCell.number(value).style(st.kpiValue);
            if (FORMATS[kind]) valueCell.style({ numberFormat: FORMATS[kind] });
        } else valueCell.string(String(value ?? '—')).style(st.kpiValue);
    });
    ws.row(row + 1).setHeight(28);
    return row + 3;
}

// Bloque etiqueta / valor (datos del documento o filtros aplicados).
function writeInfo(ws, st, row, pairs, lastCol, { section } = {}) {
    let current = row;
    if (section) {
        ws.cell(current, 1, current, lastCol, lastCol > 1).string(section.toUpperCase()).style(st.section);
        current += 1;
    }
    pairs.forEach(([label, value]) => {
        ws.cell(current, 1).string(label).style(st.label);
        ws.cell(current, 2, current, lastCol, lastCol > 2).string(value === null || value === undefined || value === '' ? '—' : String(value)).style(st.value);
        current += 1;
    });
    return current + 1;
}

function writeSection(ws, st, row, text, lastCol) {
    ws.cell(row, 1, row, lastCol, lastCol > 1).string(text.toUpperCase()).style(st.section);
    return row + 1;
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function sendWorkbook(res, wb, fileName) {
    const buffer = await wb.writeToBuffer();
    res.setHeader('Content-Type', XLSX_TYPE);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.status(200).send(buffer);
}

async function saveWorkbook(wb, filePath) {
    await fs.promises.writeFile(filePath, await wb.writeToBuffer());
    return filePath;
}

module.exports = {
    C,
    TONES,
    MOVEMENT_TONES,
    FIRST_ROW,
    createReport,
    newSheet,
    writeTable,
    writeKpis,
    writeInfo,
    writeSection,
    sendWorkbook,
    saveWorkbook,
    toExcelDate,
    stamp,
    fileStamp,
    formatDay,
    formatPeriod,
};
