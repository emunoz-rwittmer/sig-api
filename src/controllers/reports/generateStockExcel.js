const AppError = require("../../errors/AppError");
const { createReport, newSheet, writeKpis, writeTable, sendWorkbook, fileStamp, FIRST_ROW } = require('../../utils/excelReport');

// Mismo criterio que la pantalla de stock.
const getObservation = (quantity, min, max) => {
    if (quantity < min) return { text: 'Hay que ingresar stock', tone: 'bad' };
    if (quantity <= min + 5) return { text: 'Stock debe ser atendido', tone: 'warn' };
    if (quantity > max) return { text: 'Exceso de stock', tone: 'info' };
    return { text: 'Stock OK', tone: 'ok' };
};

const generateStockExcel = async (req, res, next) => {
    try {
        const data = req.body;

        if (!Array.isArray(data?.products)) {
            throw new AppError('products es requerido', 400);
        }

        const rows = data.products.map((item) => {
            const quantity = Number(item.quantity || 0);
            const min = Number(item.min || 0);
            const max = Number(item.max || 0);
            const observation = getObservation(quantity, min, max);
            return {
                tone: observation.tone,
                values: [item.sku || '', item.name || 'Sin producto', quantity, min, max,
                    Number(item.totalIncome || 0), Number(item.totalOutcome || 0), observation.text],
            };
        });
        const count = (tone) => rows.filter((row) => row.tone === tone).length;
        const toneByText = Object.fromEntries(rows.map((row) => [row.values[7], row.tone]));

        const { wb, st } = createReport();
        const ws = newSheet(wb, st, {
            name: 'Stock',
            title: 'Reporte de stock',
            subtitle: data.warehouseName || 'Bodega',
            widths: [30, 38, 12, 12, 12, 12, 12, 24],
            footer: `Stock de ${data.warehouseName || 'bodega'}`,
        });
        const next = writeKpis(ws, st, FIRST_ROW, [
            { label: 'Productos', value: rows.length },
            { label: 'Bajo el mínimo', value: count('bad') },
            { label: 'Por atender', value: count('warn') },
            { label: 'Exceso', value: count('info') },
        ]);
        writeTable(ws, st, next, [
            { title: 'SKU', kind: 'mono' }, { title: 'Producto', kind: 'strong' }, { title: 'Stock', kind: 'number' },
            { title: 'Stock mínimo', kind: 'number' }, { title: 'Stock máximo', kind: 'number' },
            { title: 'Entradas', kind: 'number' }, { title: 'Salidas', kind: 'number' },
            { title: 'Observación', kind: 'center', tone: (value) => toneByText[value] },
        ], rows.map((row) => row.values), { emptyText: 'La bodega no tiene productos' });

        const name = String(data.warehouseName || 'bodega').replace(/[^\w-]+/g, '_');
        await sendWorkbook(res, wb, `stock_${name}_${fileStamp()}.xlsx`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateStockExcel,
};
