const { createReport, newSheet, writeKpis, writeTable, saveWorkbook, formatDay, FIRST_ROW } = require('../../utils/excelReport');

const IVA = 0.15;
const isSet = (value) => value && value !== 'undefined' && value !== 'null';
// El total de la tarjeta incluye IVA: se desglosa igual que en el informe PDF.
const breakdown = (total) => {
    const subtotal = Number((Number(total || 0) / (1 + IVA)).toFixed(2));
    return { subtotal, iva: Number((subtotal * IVA).toFixed(2)), total: Number(total || 0) };
};
const sumOf = (rows, index) => Number(rows.reduce((sum, row) => sum + Number(row[index] || 0), 0).toFixed(2));

/**
 * Hojas comunes de los reportes del bar: Consumer cards, Cortecy cards y Detalle de ítems.
 * consumerCards: tarjetas con `passenger` (y `passenger.cruise`); cortecyCards: con `cruise`.
 */
function writeBarSheets(wb, st, { consumerCards, cortecyCards, subtitle, logo, footer }) {
    const consumerRows = consumerCards.map((card) => {
        const money = breakdown(card.totalCount);
        const passenger = card.passenger || {};
        return [
            passenger.name || 'N/A', passenger.cruise?.code || '', passenger.identificationNumber || '', passenger.type || 'N/A',
            String(passenger.cabin ?? 'N/A'), card.numberCard || 'N/A', passenger.cruiseStartDate, passenger.cruiseEndDate,
            money.subtotal, money.iva, money.total, card.paymentType || 'N/A', card.receiptNumber || 'N/A',
            card.paidAccount ? 'Sí' : 'No', card.items?.length || 0,
        ];
    });
    const consumer = newSheet(wb, st, {
        name: 'Consumer cards',
        title: 'Consumer cards',
        subtitle,
        widths: [32, 14, 16, 8, 9, 12, 13, 13, 12, 11, 12, 16, 14, 10, 8],
        logo,
        footer,
    });
    let next = writeKpis(consumer, st, FIRST_ROW, [
        { label: 'Tarjetas', value: consumerRows.length },
        { label: 'Subtotal', value: sumOf(consumerRows, 8), kind: 'money' },
        { label: 'IVA 15 %', value: sumOf(consumerRows, 9), kind: 'money' },
        { label: 'Total', value: sumOf(consumerRows, 10), kind: 'money' },
    ]);
    writeTable(consumer, st, next, [
        { title: 'Pasajero', kind: 'strong' }, { title: 'Crucero', kind: 'mono' }, { title: 'Identificación' }, { title: 'Tipo', kind: 'center' },
        { title: 'Cabina', kind: 'center' }, { title: 'Tarjeta N°', kind: 'mono' }, { title: 'Inicio crucero', kind: 'day' },
        { title: 'Fin crucero', kind: 'day' }, { title: 'Subtotal', kind: 'money' }, { title: 'IVA 15 %', kind: 'money' },
        { title: 'Total', kind: 'money' }, { title: 'Método de pago' }, { title: 'Recibo N°', kind: 'mono' },
        { title: 'Pagada', kind: 'yn' }, { title: 'Ítems', kind: 'int' },
    ], consumerRows, {
        emptyText: 'Sin consumer cards',
        totals: ['Total', null, null, null, null, null, null, null, 'sum', 'sum', 'sum', null, null, null, 'sum'],
    });

    const cortecyRows = cortecyCards.map((card) => {
        const money = breakdown(card.totalCount);
        return [card.numberCard || 'N/A', card.cruise?.code || '', money.subtotal, money.iva, money.total,
            card.observation || '', card.items?.length || 0, card.createdAt, card.status || 'Activa'];
    });
    const cortecy = newSheet(wb, st, {
        name: 'Cortecy cards',
        title: 'Cortecy cards (cortesías)',
        subtitle,
        widths: [30, 14, 12, 11, 12, 36, 8, 12, 12],
        logo,
        footer,
    });
    next = writeKpis(cortecy, st, FIRST_ROW, [
        { label: 'Tarjetas', value: cortecyRows.length },
        { label: 'Total cortesías', value: sumOf(cortecyRows, 4), kind: 'money' },
    ]);
    writeTable(cortecy, st, next, [
        { title: 'Tarjeta N°', kind: 'mono' }, { title: 'Crucero', kind: 'mono' }, { title: 'Subtotal', kind: 'money' },
        { title: 'IVA 15 %', kind: 'money' }, { title: 'Total', kind: 'money' }, { title: 'Observación' },
        { title: 'Ítems', kind: 'int' }, { title: 'Creada', kind: 'date' }, { title: 'Estado', kind: 'center' },
    ], cortecyRows, {
        emptyText: 'Sin cortecy cards',
        totals: ['Total', null, 'sum', 'sum', 'sum', null, 'sum', null, null],
    });

    const itemRows = [
        ...consumerCards.flatMap((card) => (card.items || []).map((item) => ['Consumer', card.numberCard, item])),
        ...cortecyCards.flatMap((card) => (card.items || []).map((item) => ['Cortecy', card.numberCard, item])),
    ].map(([type, numberCard, item]) => [
        item.product?.name || 'N/A', type, numberCard || 'N/A', Number(item.quantity || 0),
        Number(item.product?.price || 0), Number(item.price || 0),
    ]);
    const items = newSheet(wb, st, {
        name: 'Detalle de ítems',
        title: 'Detalle de ítems consumidos',
        subtitle,
        widths: [34, 12, 16, 11, 13, 13],
        logo,
        footer,
    });
    writeTable(items, st, FIRST_ROW, [
        { title: 'Producto', kind: 'strong' },
        { title: 'Tipo', kind: 'center', tone: (value) => (value === 'Cortecy' ? 'violet' : 'info') },
        { title: 'Tarjeta N°', kind: 'mono' }, { title: 'Cantidad', kind: 'int' },
        { title: 'Precio unit.', kind: 'money' }, { title: 'Total', kind: 'money' },
    ], itemRows, { emptyText: 'Sin ítems consumidos', totals: ['Total', null, null, 'sum', null, 'sum'] });
}

exports.generateConsumerCardReportExcel = async (yachtName, start, end, consumerCards, cortecyCards, filePath, { logo } = {}) => {
    const periodo = isSet(start) && isSet(end) ? `Del ${formatDay(start)} al ${formatDay(end)}` : 'Todo el periodo';
    const subtitle = `Yate ${yachtName} · ${periodo}`;
    const { wb, st } = createReport();

    // Resumen por crucero: una fila por crucero con lo vendido y las cortesías.
    const cruises = new Map();
    const cruiseRow = (cruise) => {
        if (!cruises.has(cruise.code)) {
            cruises.set(cruise.code, [cruise.code, cruise.name || '', cruise.startDate, cruise.endDate, cruise.barman || 'N/A', 0, 0, 0, 0]);
        }
        return cruises.get(cruise.code);
    };
    consumerCards.filter((card) => card.passenger?.cruise).forEach((card) => {
        const row = cruiseRow(card.passenger.cruise);
        row[5] += 1;
        row[6] = Number((row[6] + Number(card.totalCount || 0)).toFixed(2));
    });
    cortecyCards.filter((card) => card.cruise).forEach((card) => {
        const row = cruiseRow(card.cruise);
        row[7] += 1;
        row[8] = Number((row[8] + Number(card.totalCount || 0)).toFixed(2));
    });
    const summaryRows = [...cruises.values()].sort((a, b) => new Date(a[2]) - new Date(b[2]));

    const summary = newSheet(wb, st, {
        name: 'Resumen',
        title: 'Reporte de consumos del bar',
        subtitle,
        widths: [30, 26, 13, 13, 22, 12, 14, 12, 14],
        logo,
    });
    const next = writeKpis(summary, st, FIRST_ROW, [
        { label: 'Cruceros', value: summaryRows.length },
        { label: 'Consumer cards', value: consumerCards.length },
        { label: 'Vendido (con IVA)', value: sumOf(summaryRows, 6), kind: 'money' },
        { label: 'Cortesías', value: sumOf(summaryRows, 8), kind: 'money' },
    ]);
    writeTable(summary, st, next, [
        { title: 'Crucero', kind: 'mono' }, { title: 'Nombre' }, { title: 'Inicio', kind: 'day' }, { title: 'Fin', kind: 'day' },
        { title: 'Barman' }, { title: 'Consumer cards', kind: 'int' }, { title: 'Total vendido', kind: 'money' },
        { title: 'Cortecy cards', kind: 'int' }, { title: 'Total cortesías', kind: 'money' },
    ], summaryRows, {
        emptyText: 'Sin consumos en el periodo',
        totals: ['Total', null, null, null, null, 'sum', 'sum', 'sum', 'sum'],
    });

    writeBarSheets(wb, st, { consumerCards, cortecyCards, subtitle, logo, footer: 'Reporte de consumos del bar' });
    return saveWorkbook(wb, filePath);
};

exports.writeBarSheets = writeBarSheets;
