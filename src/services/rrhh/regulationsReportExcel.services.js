const xl = require('excel4node');
const moment = require('moment');

const NAVY = '0B2A45';
const BAND = 'F3F7FA';
const GREEN = '15803D';
const AMBER = 'B45309';
const BLUE = '0F6E8C';

const formatDate = (value) => (value ? moment(value).format('DD/MM/YYYY HH:mm') : '');
const staffName = (staff) => (staff ? `${staff.lastName ?? ''} ${staff.firstName ?? ''}`.trim() : '') || 'Colaborador';
const toneColor = (pct) => (pct >= 90 ? GREEN : pct >= 50 ? BLUE : AMBER);

const buildStyles = (wb) => {
    const edge = { style: 'thin', color: 'DDE4EA' };
    const border = { left: edge, right: edge, top: edge, bottom: edge };
    const solid = (color) => ({ type: 'pattern', patternType: 'solid', fgColor: color });
    const cell = (extra = {}) => wb.createStyle({ font: { size: 10 }, border, alignment: { vertical: 'center' }, ...extra });
    const centered = { horizontal: 'center', vertical: 'center' };
    const totalBorder = { ...border, top: { style: 'medium', color: NAVY } };

    return {
        title: wb.createStyle({ font: { bold: true, size: 16, color: NAVY }, alignment: { vertical: 'center' } }),
        subtitle: wb.createStyle({ font: { italic: true, size: 10, color: '7A8B99' } }),
        header: wb.createStyle({
            font: { bold: true, size: 10, color: 'FFFFFF' },
            fill: solid(NAVY),
            border,
            alignment: { ...centered, wrapText: true },
        }),
        cell: (band) => cell(band ? { fill: solid(BAND) } : {}),
        center: (band) => cell({ alignment: centered, ...(band ? { fill: solid(BAND) } : {}) }),
        pct: (color, band) => cell({
            font: { bold: true, size: 10, color },
            numberFormat: '0%',
            alignment: centered,
            ...(band ? { fill: solid(BAND) } : {}),
        }),
        status: (color, band) => cell({
            font: { bold: true, size: 10, color },
            alignment: centered,
            ...(band ? { fill: solid(BAND) } : {}),
        }),
        total: wb.createStyle({ font: { bold: true, size: 10, color: NAVY }, border: totalBorder, alignment: centered }),
        totalPct: wb.createStyle({
            font: { bold: true, size: 10, color: NAVY },
            numberFormat: '0%',
            border: totalBorder,
            alignment: centered,
        }),
        empty: wb.createStyle({ font: { italic: true, size: 10, color: '7A8B99' }, alignment: { horizontal: 'center' } }),
    };
};

const addHeader = (ws, styles, title, subtitle, headers, widths) => {
    widths.forEach((width, i) => ws.column(i + 1).setWidth(width));
    ws.row(1).setHeight(28);
    ws.row(4).setHeight(26);
    ws.cell(1, 1, 1, headers.length, true).string(title).style(styles.title);
    ws.cell(2, 1, 2, headers.length, true).string(subtitle).style(styles.subtitle);
    headers.forEach((header, i) => ws.cell(4, i + 1).string(header).style(styles.header));
    ws.row(4).freeze();
};

/**
 * `records`: reglamentos (plain) con `company` y `reads[].staff` (cargo/departamento).
 * Hoja "Resumen" (avance por reglamento) + hoja "Detalle" (quién leyó y quién no).
 */
exports.generateRegulationsReadingReportExcel = async (records, filePath, { companyName } = {}) => {
    const wb = new xl.Workbook({ dateFormat: 'dd/mm/yyyy' });
    const styles = buildStyles(wb);
    const subtitle = `${companyName || 'Todas las empresas'} · Generado el ${formatDate(new Date())}`;

    // --- Resumen ---
    const summary = wb.addWorksheet('Resumen', { sheetView: { showGridLines: false } });
    addHeader(
        summary, styles, 'REPORTE DE LECTURA DE REGLAMENTOS', subtitle,
        ['Reglamento', 'Empresa', 'Publicado', 'Asignados', 'Leídos', 'Pendientes', '% Lectura'],
        [46, 28, 14, 12, 10, 12, 12],
    );

    let row = 5;
    records.forEach((reg, i) => {
        const band = i % 2 === 1;
        const reads = reg.reads ?? [];
        const done = reads.filter((read) => read.read).length;
        const pct = reads.length ? done / reads.length : 0;
        summary.cell(row, 1).string(reg.name ?? '').style(styles.cell(band));
        summary.cell(row, 2).string(reg.company?.name ?? 'Sin empresa').style(styles.cell(band));
        summary.cell(row, 3).string(moment(reg.createdAt).format('DD/MM/YYYY')).style(styles.center(band));
        summary.cell(row, 4).number(reads.length).style(styles.center(band));
        summary.cell(row, 5).number(done).style(styles.center(band));
        summary.cell(row, 6).number(reads.length - done).style(styles.center(band));
        summary.cell(row, 7).number(pct).style(styles.pct(toneColor(pct * 100), band));
        row++;
    });

    if (records.length === 0) {
        summary.cell(row, 1, row, 7, true).string('No hay reglamentos para el filtro seleccionado.').style(styles.empty);
    } else {
        summary.cell(row, 1, row, 3, true).string('TOTAL').style(styles.total);
        ['D', 'E', 'F'].forEach((col, i) => {
            summary.cell(row, 4 + i).formula(`SUM(${col}5:${col}${row - 1})`).style(styles.total);
        });
        summary.cell(row, 7).formula(`IF(D${row}=0,0,E${row}/D${row})`).style(styles.totalPct);
    }

    // --- Detalle ---
    const detail = wb.addWorksheet('Detalle', { sheetView: { showGridLines: false } });
    addHeader(
        detail, styles, 'DETALLE DE LECTURA POR COLABORADOR', subtitle,
        ['Reglamento', 'Empresa', 'Colaborador', 'Cargo', 'Departamento', 'Correo', 'Estado', 'Fecha de lectura'],
        [40, 26, 32, 26, 24, 30, 13, 18],
    );

    let detailRow = 5;
    records.forEach((reg) => {
        [...(reg.reads ?? [])]
            .sort((a, b) => Number(a.read) - Number(b.read) || staffName(a.staff).localeCompare(staffName(b.staff)))
            .forEach((read) => {
                const band = (detailRow - 5) % 2 === 1;
                detail.cell(detailRow, 1).string(reg.name ?? '').style(styles.cell(band));
                detail.cell(detailRow, 2).string(reg.company?.name ?? 'Sin empresa').style(styles.cell(band));
                detail.cell(detailRow, 3).string(staffName(read.staff)).style(styles.cell(band));
                detail.cell(detailRow, 4).string(read.staff?.staff_position?.name ?? 'N/A').style(styles.cell(band));
                detail.cell(detailRow, 5).string(read.staff?.staff_departament?.name ?? 'N/A').style(styles.cell(band));
                detail.cell(detailRow, 6).string(read.staff?.email ?? 'N/A').style(styles.cell(band));
                detail.cell(detailRow, 7).string(read.read ? 'Leído' : 'Pendiente').style(styles.status(read.read ? GREEN : AMBER, band));
                detail.cell(detailRow, 8).string(read.read ? formatDate(read.updatedAt) : '').style(styles.center(band));
                detailRow++;
            });
    });

    if (detailRow === 5) {
        detail.cell(5, 1, 5, 8, true).string('No hay colaboradores asignados.').style(styles.empty);
    } else {
        detail.row(4).filter({ firstRow: 4, firstColumn: 1, lastRow: detailRow - 1, lastColumn: 8 });
    }

    await new Promise((resolve, reject) => {
        wb.write(filePath, (err) => (err ? reject(err) : resolve()));
    });

    return filePath;
};
