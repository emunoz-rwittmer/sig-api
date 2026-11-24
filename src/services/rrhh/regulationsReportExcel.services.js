const { createReport, newSheet, writeKpis, writeTable, saveWorkbook, FIRST_ROW } = require('../../utils/excelReport');

const staffName = (staff) => (staff ? `${staff.lastName ?? ''} ${staff.firstName ?? ''}`.trim() : '') || 'Colaborador';
const progressTone = (ratio) => (ratio >= 0.9 ? 'ok' : ratio >= 0.5 ? 'info' : 'warn');

/**
 * `records`: reglamentos (plain) con `company` y `reads[].staff` (cargo/departamento).
 * Hoja "Resumen" (avance por reglamento) + hoja "Detalle" (quién leyó y quién no).
 */
exports.generateRegulationsReadingReportExcel = async (records, filePath, { companyName, companyLogo } = {}) => {
    const { wb, st } = createReport();
    const subtitle = companyName || 'Todas las empresas';

    const summaryRows = records.map((reg) => {
        const reads = reg.reads ?? [];
        const done = reads.filter((read) => read.read).length;
        return [reg.name ?? '', reg.company?.name ?? 'Sin empresa', reg.createdAt, reads.length, done, reads.length - done,
            reads.length ? done / reads.length : 0];
    });
    const assigned = summaryRows.reduce((sum, row) => sum + row[3], 0);
    const read = summaryRows.reduce((sum, row) => sum + row[4], 0);

    // --- Resumen ---
    const summary = newSheet(wb, st, {
        name: 'Resumen',
        title: 'Lectura de reglamentos',
        subtitle,
        widths: [46, 28, 14, 12, 10, 12, 12],
        logo: companyLogo,
    });
    const next = writeKpis(summary, st, FIRST_ROW, [
        { label: 'Reglamentos', value: records.length },
        { label: 'Lecturas asignadas', value: assigned },
        { label: 'Leídas', value: read },
        { label: 'Avance', value: assigned ? read / assigned : 0, kind: 'ratio' },
    ]);
    writeTable(summary, st, next, [
        { title: 'Reglamento', kind: 'strong' }, { title: 'Empresa' }, { title: 'Publicado', kind: 'date' },
        { title: 'Asignados', kind: 'int' }, { title: 'Leídos', kind: 'int' }, { title: 'Pendientes', kind: 'int' },
        { title: '% Lectura', kind: 'ratio', tone: progressTone },
    ], summaryRows, {
        emptyText: 'No hay reglamentos para el filtro seleccionado.',
        totals: ['Total', null, null, 'sum', 'sum', 'sum', assigned ? read / assigned : 0],
    });

    // --- Detalle ---
    const detailRows = records.flatMap((reg) => [...(reg.reads ?? [])]
        .sort((a, b) => Number(a.read) - Number(b.read) || staffName(a.staff).localeCompare(staffName(b.staff)))
        .map((item) => [
            reg.name ?? '',
            reg.company?.name ?? 'Sin empresa',
            staffName(item.staff),
            item.staff?.staff_position?.name ?? 'N/A',
            item.staff?.staff_departament?.name ?? 'N/A',
            item.staff?.email ?? 'N/A',
            item.read ? 'Leído' : 'Pendiente',
            item.read ? item.updatedAt : null,
        ]));
    const detail = newSheet(wb, st, {
        name: 'Detalle',
        title: 'Detalle de lectura por colaborador',
        subtitle,
        widths: [40, 26, 32, 26, 24, 30, 13, 17],
        logo: companyLogo,
        footer: 'Lectura de reglamentos',
    });
    writeTable(detail, st, FIRST_ROW, [
        { title: 'Reglamento' }, { title: 'Empresa' }, { title: 'Colaborador', kind: 'strong' }, { title: 'Cargo' },
        { title: 'Departamento' }, { title: 'Correo' },
        { title: 'Estado', kind: 'center', tone: (value) => (value === 'Leído' ? 'ok' : 'warn') },
        { title: 'Fecha de lectura', kind: 'datetime' },
    ], detailRows, { emptyText: 'No hay colaboradores asignados.' });

    return saveWorkbook(wb, filePath);
};
