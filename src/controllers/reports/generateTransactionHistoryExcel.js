const xl = require('excel4node');
const TransactionHistoryService = require('../../services/operations/inventory/transactionHistory.services');
const Warehouse = require('../../models/catalogs/wareHouse.models');
const Staff = require('../../models/catalogs/staff.models');
const Product = require('../../models/operations/inventory/product.models');
const AppError = require('../../errors/AppError');
const { parseHistoryFilters } = require('../operations/inventory/transactionHistory.controller');
const {
    MOVEMENT_KEYS,
    buildProductSummary,
    buildWarehouseSummary,
    countByMovement,
    formatReportDate,
    formatReportTime,
    getFullName,
    getMovementLabel,
} = require('../../utils/transactionMovements');

// Paleta del design system del frontend (docs/CONVENTIONS.md §1 en interno-react).
const COLORS = {
    navy: '0B2A45',
    teal: '0F6E8C',
    muted: '5A6E7D',
    label: '7A8B99',
    border: 'DDE4EA',
    headFill: 'F1F4F7',
    zebra: 'F7F9FB',
    white: 'FFFFFF',
};

const MOVEMENT_COLORS = {
    ENTRY: { fill: 'E7F6EC', font: '15803D' },
    TRANSFER: { fill: 'E8F4F8', font: '0F6E8C' },
    EXIT: { fill: 'FFF4E5', font: 'B45309' },
    BAR_CONSUMPTION: { fill: 'F3EEFC', font: '6D28D9' },
    ADJUST: { fill: 'F1F4F7', font: '64748B' },
};

const QTY_FORMAT = '#,##0.00';
const INT_FORMAT = '#,##0';
const PCT_FORMAT = '0.0%';

const thin = { style: 'thin', color: COLORS.border };
const BORDER = { left: thin, right: thin, top: thin, bottom: thin };
const solid = (color) => ({ type: 'pattern', patternType: 'solid', fgColor: color });

const DETAIL_COLUMNS = [
    { title: 'N°', width: 7 },
    { title: 'Fecha', width: 12 },
    { title: 'Hora', width: 8 },
    { title: 'Movimiento', width: 17 },
    { title: 'Producto', width: 38 },
    { title: 'SKU', width: 16 },
    { title: 'Cantidad', width: 12 },
    { title: 'Unidad', width: 10 },
    { title: 'Bodega origen', width: 26 },
    { title: 'Bodega destino', width: 26 },
    { title: 'Responsable', width: 28 },
    { title: 'N° registro', width: 13 },
    { title: 'Referencia', width: 26 },
];

const PRODUCT_COLUMNS = [
    { title: 'Producto', width: 40 },
    { title: 'SKU', width: 16 },
    { title: 'Unidad', width: 10 },
    { title: 'Movimientos', width: 13 },
    ...MOVEMENT_KEYS.map((key) => ({ title: getMovementLabel(key), width: 16, movement: key })),
];

function createStyles(wb) {
    const base = { font: { name: 'Calibri', size: 10, color: COLORS.navy } };
    return {
        title: wb.createStyle({
            font: { name: 'Calibri', size: 16, bold: true, color: COLORS.white },
            fill: solid(COLORS.navy),
            alignment: { vertical: 'center', indent: 1 },
        }),
        subtitle: wb.createStyle({
            font: { name: 'Calibri', size: 10, color: 'A7C4D1' },
            fill: solid(COLORS.navy),
            alignment: { vertical: 'center', indent: 1 },
        }),
        section: wb.createStyle({
            font: { name: 'Calibri', size: 10, bold: true, color: COLORS.teal },
            border: { bottom: { style: 'medium', color: COLORS.teal } },
        }),
        header: wb.createStyle({
            font: { name: 'Calibri', size: 10, bold: true, color: COLORS.white },
            fill: solid(COLORS.teal),
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: BORDER,
        }),
        filterLabel: wb.createStyle({
            ...base,
            font: { ...base.font, bold: true, color: COLORS.muted },
            fill: solid(COLORS.headFill),
            border: BORDER,
            alignment: { indent: 1 },
        }),
        filterValue: wb.createStyle({ ...base, border: BORDER, alignment: { indent: 1, wrapText: true } }),
        cell: wb.createStyle({ ...base, border: BORDER, alignment: { vertical: 'center' } }),
        cellZebra: wb.createStyle({ ...base, border: BORDER, fill: solid(COLORS.zebra), alignment: { vertical: 'center' } }),
        center: wb.createStyle({ alignment: { horizontal: 'center' } }),
        mono: wb.createStyle({ font: { name: 'Consolas', size: 9.5, color: COLORS.navy } }),
        qty: wb.createStyle({ numberFormat: QTY_FORMAT, alignment: { horizontal: 'right' } }),
        int: wb.createStyle({ numberFormat: INT_FORMAT, alignment: { horizontal: 'right' } }),
        pct: wb.createStyle({ numberFormat: PCT_FORMAT, alignment: { horizontal: 'right' } }),
        bold: wb.createStyle({ font: { bold: true } }),
        total: wb.createStyle({
            font: { name: 'Calibri', size: 10, bold: true, color: COLORS.navy },
            fill: solid('E2E8EE'),
            border: { ...BORDER, top: { style: 'medium', color: COLORS.navy } },
        }),
        footnote: wb.createStyle({ font: { name: 'Calibri', size: 9, italic: true, color: COLORS.label } }),
        movement: Object.fromEntries(MOVEMENT_KEYS.map((key) => [key, wb.createStyle({
            font: { bold: true, color: MOVEMENT_COLORS[key].font },
            fill: solid(MOVEMENT_COLORS[key].fill),
            alignment: { horizontal: 'center' },
        })])),
    };
}

const SHEET_OPTIONS = {
    sheetView: { showGridLines: false },
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 },
    sheetFormat: { defaultRowHeight: 16 },
};

function writeBanner(ws, styles, lastColumn, title, subtitle) {
    ws.cell(1, 1, 1, lastColumn, true).string(title).style(styles.title);
    ws.cell(2, 1, 2, lastColumn, true).string(subtitle).style(styles.subtitle);
    ws.row(1).setHeight(30);
    ws.row(2).setHeight(18);
}

function writeHeaderRow(ws, styles, row, columns) {
    columns.forEach((column, index) => {
        ws.cell(row, index + 1).string(column.title).style(styles.header);
        if (column.width) ws.column(index + 1).setWidth(column.width);
    });
    ws.row(row).setHeight(22);
}

const rowStyle = (styles, index) => (index % 2 ? styles.cellZebra : styles.cell);

function formatPeriod(filters) {
    if (!filters.from && !filters.to) return 'Todo el historial';
    if (filters.from && filters.to) return `${formatReportDate(filters.from)} al ${formatReportDate(filters.to)}`;
    return filters.from ? `Desde el ${formatReportDate(filters.from)}` : `Hasta el ${formatReportDate(filters.to)}`;
}

async function resolveFilterLabels(filters) {
    const warehouseName = async (id) => (id ? (await Warehouse.findByPk(id, { attributes: ['name'] }))?.name : null);
    const [warehouse, warehouseFrom, warehouseTo, responsible, product] = await Promise.all([
        warehouseName(filters.warehouseId),
        warehouseName(filters.warehouseFromId),
        warehouseName(filters.warehouseToId),
        filters.userId ? Staff.findByPk(filters.userId, { attributes: ['firstName', 'lastName'] }) : null,
        filters.productId ? Product.findByPk(filters.productId, { attributes: ['name', 'sku'] }) : null,
    ]);

    const all = 'Todos';
    return [
        ['Periodo', formatPeriod(filters)],
        ['Movimientos', filters.movements.length ? filters.movements.map(getMovementLabel).join(', ') : all],
        ['Bodega (origen o destino)', warehouse ?? 'Todas'],
        ['Bodega origen', warehouseFrom ?? 'Todas'],
        ['Bodega destino', warehouseTo ?? 'Todas'],
        ['Responsable', responsible ? getFullName(responsible) : all],
        ['Producto', product ? [product.name, product.sku].filter(Boolean).join(' · ') : all],
        ['Búsqueda', filters.search || '—'],
        ['Orden', filters.sortOrder === 'asc' ? 'Más antiguas primero' : 'Más recientes primero'],
    ];
}

function writeSummarySheet(wb, styles, { rows, filterLabels, generatedAt }) {
    const ws = wb.addWorksheet('Resumen', SHEET_OPTIONS);
    const lastColumn = 5;
    [30, 26, 14, 14, 14].forEach((width, index) => ws.column(index + 1).setWidth(width));

    writeBanner(ws, styles, lastColumn, 'Reporte de transacciones de inventario', `Generado el ${generatedAt}`);

    let row = 4;
    ws.cell(row, 1, row, lastColumn, true).string('FILTROS APLICADOS').style(styles.section);
    row += 1;
    filterLabels.forEach(([label, value]) => {
        ws.cell(row, 1).string(label).style(styles.filterLabel);
        ws.cell(row, 2, row, lastColumn, true).string(String(value)).style(styles.filterValue);
        row += 1;
    });

    row += 1;
    ws.cell(row, 1, row, lastColumn, true).string('TOTALES POR TIPO DE MOVIMIENTO').style(styles.section);
    row += 1;
    writeHeaderRow(ws, styles, row, [{ title: 'Movimiento' }, { title: 'Transacciones' }, { title: '% del total' }]);
    row += 1;

    const counts = countByMovement(rows);
    const total = rows.length;
    MOVEMENT_KEYS.forEach((key) => {
        ws.cell(row, 1).string(getMovementLabel(key)).style(styles.cell).style(styles.movement[key]);
        ws.cell(row, 2).number(counts[key]).style(styles.cell).style(styles.int);
        ws.cell(row, 3).number(total ? counts[key] / total : 0).style(styles.cell).style(styles.pct);
        row += 1;
    });
    ws.cell(row, 1).string('Total').style(styles.total);
    ws.cell(row, 2).number(total).style(styles.total).style(styles.int);
    ws.cell(row, 3).number(total ? 1 : 0).style(styles.total).style(styles.pct);
    row += 1;

    const distinctProducts = new Set(rows.map((item) => item.productId)).size;
    const distinctResponsibles = new Set(rows.map((item) => item.responsible?.id).filter(Boolean)).size;
    ws.cell(row + 1, 1).string('Productos distintos').style(styles.filterLabel);
    ws.cell(row + 1, 2).number(distinctProducts).style(styles.filterValue).style(styles.int);
    ws.cell(row + 2, 1).string('Responsables distintos').style(styles.filterLabel);
    ws.cell(row + 2, 2).number(distinctResponsibles).style(styles.filterValue).style(styles.int);
    row += 4;

    ws.cell(row, 1, row, lastColumn, true).string('MOVIMIENTOS POR BODEGA').style(styles.section);
    row += 1;
    writeHeaderRow(ws, styles, row, [
        { title: 'Bodega' }, { title: 'Ubicación' }, { title: 'Entradas' }, { title: 'Salidas' }, { title: 'Total' },
    ]);
    row += 1;

    const warehouses = buildWarehouseSummary(rows);
    if (!warehouses.length) {
        ws.cell(row, 1, row, lastColumn, true).string('Sin movimientos entre bodegas en el periodo.').style(styles.footnote);
        row += 1;
    }
    warehouses.forEach((warehouse, index) => {
        const style = rowStyle(styles, index);
        ws.cell(row, 1).string(warehouse.name).style(style).style(styles.bold);
        ws.cell(row, 2).string(warehouse.location || '—').style(style);
        ws.cell(row, 3).number(warehouse.incoming).style(style).style(styles.int);
        ws.cell(row, 4).number(warehouse.outgoing).style(style).style(styles.int);
        ws.cell(row, 5).number(warehouse.total).style(style).style(styles.int);
        row += 1;
    });

    ws.cell(row + 1, 1, row + 1, lastColumn, true)
        .string('Entradas y salidas cuentan transacciones, no cantidades: cada producto tiene su propia unidad de medida.')
        .style(styles.footnote);
}

function writeDetailSheet(wb, styles, { rows, generatedAt, period }) {
    const ws = wb.addWorksheet('Detalle', SHEET_OPTIONS);
    const lastColumn = DETAIL_COLUMNS.length;
    const headerRow = 4;

    writeBanner(ws, styles, lastColumn, 'Detalle de transacciones', `${period} · ${rows.length} transacciones · Generado el ${generatedAt}`);
    writeHeaderRow(ws, styles, headerRow, DETAIL_COLUMNS);

    rows.forEach((item, index) => {
        const row = headerRow + 1 + index;
        const style = rowStyle(styles, index);
        ws.cell(row, 1).number(index + 1).style(style).style(styles.center);
        ws.cell(row, 2).string(formatReportDate(item.createdAt)).style(style).style(styles.center);
        ws.cell(row, 3).string(formatReportTime(item.createdAt)).style(style).style(styles.center);
        ws.cell(row, 4).string(getMovementLabel(item.movement)).style(style).style(styles.movement[item.movement]);
        ws.cell(row, 5).string(item.product?.name ?? 'Sin producto').style(style).style(styles.bold);
        ws.cell(row, 6).string(item.product?.sku ?? '').style(style).style(styles.mono);
        ws.cell(row, 7).number(item.quantity).style(style).style(styles.qty);
        ws.cell(row, 8).string(item.product?.unit ?? '').style(style).style(styles.center);
        ws.cell(row, 9).string(item.warehouseFrom?.name ?? '—').style(style);
        ws.cell(row, 10).string(item.warehouseTo?.name ?? '—').style(style);
        ws.cell(row, 11).string(item.responsible?.fullName || 'Sin registrar').style(style);
        ws.cell(row, 12).string(item.register?.counter ?? '').style(style).style(styles.mono);
        ws.cell(row, 13).string(item.referenceId ?? '').style(style).style(styles.mono);
    });

    const totalRow = headerRow + rows.length + 1;
    ws.cell(totalRow, 1, totalRow, 6, true).string(`Total: ${rows.length} transacciones`).style(styles.total);
    for (let column = 7; column <= lastColumn; column += 1) ws.cell(totalRow, column).style(styles.total);

    ws.row(headerRow).freeze();
    if (rows.length) ws.row(headerRow).filter({ firstColumn: 1, lastColumn });
}

function writeProductSheet(wb, styles, { rows, period }) {
    const ws = wb.addWorksheet('Por producto', SHEET_OPTIONS);
    const lastColumn = PRODUCT_COLUMNS.length;
    const headerRow = 4;
    const products = buildProductSummary(rows);

    writeBanner(ws, styles, lastColumn, 'Cantidades por producto', `${period} · ${products.length} productos · cantidades en la unidad de cada producto`);
    writeHeaderRow(ws, styles, headerRow, PRODUCT_COLUMNS);

    products.forEach((product, index) => {
        const row = headerRow + 1 + index;
        const style = rowStyle(styles, index);
        ws.cell(row, 1).string(product.name).style(style).style(styles.bold);
        ws.cell(row, 2).string(product.sku).style(style).style(styles.mono);
        ws.cell(row, 3).string(product.unit).style(style).style(styles.center);
        ws.cell(row, 4).number(product.movements).style(style).style(styles.int);
        MOVEMENT_KEYS.forEach((key, offset) => {
            ws.cell(row, 5 + offset).number(product.quantities[key]).style(style).style(styles.qty);
        });
    });

    ws.row(headerRow).freeze();
    if (products.length) ws.row(headerRow).filter({ firstColumn: 1, lastColumn });
}

const generateTransactionHistoryExcel = async (req, res, next) => {
    try {
        const filters = parseHistoryFilters(req.query);
        const rows = await TransactionHistoryService.listForExport(filters);

        if (rows === null) {
            throw new AppError(
                `El reporte supera ${TransactionHistoryService.MAX_EXPORT_ROWS} transacciones; acota el rango de fechas o los filtros.`,
                400,
            );
        }

        const now = new Date();
        const generatedAt = `${formatReportDate(now)} ${formatReportTime(now)}`;
        const filterLabels = await resolveFilterLabels(filters);
        const period = formatPeriod(filters);

        const wb = new xl.Workbook({
            defaultFont: { name: 'Calibri', size: 10 },
            author: 'Rolf Wittmer SIG',
        });
        const styles = createStyles(wb);

        writeSummarySheet(wb, styles, { rows, filterLabels, generatedAt });
        writeDetailSheet(wb, styles, { rows, generatedAt, period });
        writeProductSheet(wb, styles, { rows, period });

        const buffer = await wb.writeToBuffer();
        const stamp = formatReportDate(now).split('/').reverse().join('');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=transacciones_${stamp}.xlsx`);
        res.status(200).send(buffer);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateTransactionHistoryExcel,
};
