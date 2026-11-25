const XLSX = require('xlsx');
const { createReport, newSheet, writeTable, toExcelDate, formatDay, formatPeriod, FIRST_ROW } = require('../../../src/utils/excelReport');

describe('excelReport', () => {
    it('pasa los instantes a la hora de Ecuador y deja los días de calendario intactos', () => {
        // 02:00 UTC del 25 = 21:00 del 24 en Ecuador
        expect(toExcelDate('2026-11-25T02:00:00Z').toISOString()).toBe('2026-11-24T21:00:00.000Z');
        expect(toExcelDate('2026-11-25T00:00:00Z', 'day').toISOString()).toBe('2026-11-25T00:00:00.000Z');
        expect(toExcelDate('2026-11-25').toISOString()).toBe('2026-11-25T00:00:00.000Z');
        expect(toExcelDate('nada')).toBeNull();
    });

    it('formatea días y periodos sin correrse por la zona horaria', () => {
        expect(formatDay('2026-01-01')).toBe('01/01/2026');
        expect(formatPeriod('2026-01-01', '2026-06-30')).toBe('01/01/2026 al 30/06/2026');
        expect(formatPeriod('null', undefined)).toBe('Todo el historial');
    });

    it('escribe la tabla con banner, números reales y fila de totales', async () => {
        const { wb, st } = createReport();
        const ws = newSheet(wb, st, { name: 'Prueba', title: 'Título', subtitle: 'Sub', widths: [30, 12] });
        writeTable(ws, st, FIRST_ROW, [{ title: 'Nombre' }, { title: 'Monto', kind: 'money' }], [['a', 2.5], ['b', null]], {
            totals: ['Total', 'sum'],
        });
        const sheet = XLSX.read(await wb.writeToBuffer(), { type: 'buffer', cellNF: true, sheetStubs: true }).Sheets.Prueba;

        expect(sheet.B1.v).toBe('Título');
        expect(sheet[`A${FIRST_ROW}`].v).toBe('Nombre');
        expect(sheet[`B${FIRST_ROW + 1}`]).toMatchObject({ t: 'n', v: 2.5 });
        expect(sheet[`B${FIRST_ROW + 2}`].v).toBe('—');
        expect(sheet[`B${FIRST_ROW + 3}`].f).toBe(`SUM(B${FIRST_ROW + 1}:B${FIRST_ROW + 2})`);
    });
});
