const Utils = require("../../utils/Utils");
const WarehouseService = require("../../services/operations/inventory/warehouse.services");
const AppError = require("../../errors/AppError");
const { classifyMovement, getMovementLabel, MOVEMENT_KEYS } = require('../../utils/transactionMovements');
const { createReport, newSheet, writeKpis, writeTable, sendWorkbook, fileStamp, MOVEMENT_TONES, FIRST_ROW } = require('../../utils/excelReport');

const decodeId = (value, fieldName) => {
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

const TONE_BY_LABEL = Object.fromEntries(MOVEMENT_KEYS.map((key) => [getMovementLabel(key), MOVEMENT_TONES[key]]));

const generateTransactionsExcel = async (req, res, next) => {
    try {
        const stockId = decodeId(req.params.stock_id, 'stock_id');
        const result = await WarehouseService.getStockProduct(stockId);

        if (!result) {
            throw new AppError('Stock no encontrado', 404);
        }

        const transactions = [...(result.product?.transactions ?? [])]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const movements = transactions.map((item) => getMovementLabel(classifyMovement(item)));

        const { wb, st } = createReport();
        const ws = newSheet(wb, st, {
            name: 'Transacciones',
            title: 'Transacciones del producto',
            subtitle: `${result.product?.name || 'Producto'} · Bodega ${result.warehouse?.name || '—'} · ${result.company?.name || 'Sin empresa'}`,
            widths: [30, 14, 16, 26, 26, 12, 32],
            logo: result.company?.logo,
            footer: `Transacciones de ${result.product?.name || 'producto'}`,
        });
        const next = writeKpis(ws, st, FIRST_ROW, [
            { label: 'Stock actual', value: Number(result.quantity), kind: 'number' },
            { label: 'Transacciones', value: transactions.length },
            { label: 'Stock mínimo', value: Number(result.min), kind: 'number' },
            { label: 'Stock máximo', value: Number(result.max), kind: 'number' },
        ]);
        writeTable(ws, st, next, [
            { title: 'Responsable' }, { title: 'Fecha', kind: 'datetime' },
            { title: 'Movimiento', kind: 'center', tone: (value) => TONE_BY_LABEL[value] },
            { title: 'Bodega origen' }, { title: 'Bodega destino' }, { title: 'Cantidad', kind: 'number' }, { title: 'Motivo' },
        ], transactions.map((item, i) => [
            [item.responsible?.firstName, item.responsible?.lastName].filter(Boolean).join(' ') || 'Sin registrar',
            item.createdAt,
            movements[i],
            item.warehouseFrom?.name || '—',
            item.warehouseTo?.name || '—',
            item.quantity,
            [item.reason, item.note].filter(Boolean).join(' · '),
        ]), { emptyText: 'El producto no tiene transacciones' });

        const name = String(result.product?.name || 'producto').replace(/[^\w-]+/g, '_');
        await sendWorkbook(res, wb, `transacciones_${name}_${fileStamp()}.xlsx`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateTransactionsExcel,
};
