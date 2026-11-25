const Utils = require("../../utils/Utils");
const ReportService = require("../../services/reports/reports.services");
const AppError = require("../../errors/AppError");
const { formatReportDate } = require('../../utils/transactionMovements');
const { createReport, newSheet, writeInfo, writeTable, sendWorkbook, FIRST_ROW } = require('../../utils/excelReport');

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

const ITEM_TONES = { ingresado: 'ok', recibido: 'ok', pendiente: 'warn' };

const generateOrderExcel = async (req, res, next) => {
    try {
        const order_id = decodeId(req.params.order_id, 'order_id');
        const result = await ReportService.getOrderReport(order_id);

        if (!result) {
            throw new AppError('Orden no encontrada', 404);
        }
        if (!result.orderItems || result.orderItems.length === 0) {
            throw new AppError('No hay items en la orden.', 400);
        }

        const company = result.company;
        const lastCol = 3;
        const { wb, st } = createReport();
        const ws = newSheet(wb, st, {
            name: 'Pedido',
            title: `Pedido ${result.name || ''}`.trim(),
            subtitle: [company?.name, company?.ruc && `RUC ${company.ruc}`].filter(Boolean).join(' · '),
            meta: company?.adress || undefined,
            widths: [30, 16, 22],
            logo: company?.logo,
            footer: `Pedido ${result.name || ''} · Guía ${result.guide || '—'}`,
            portrait: true,
        });
        const next = writeInfo(ws, st, FIRST_ROW, [
            ['N° de guía', result.guide],
            ['Solicitante', [result.responsible?.firstName, result.responsible?.lastName].filter(Boolean).join(' ')],
            ['Estado', result.status],
            ['Fecha de solicitud', formatReportDate(result.createdAt)],
            ['Ítems', result.orderItems.length],
        ], lastCol, { section: 'Datos del pedido' });

        writeTable(ws, st, next, [
            { title: 'Producto', kind: 'strong' },
            { title: 'Cantidad', kind: 'number' },
            { title: 'Estado', kind: 'center', tone: (value) => ITEM_TONES[String(value).toLowerCase()] || null },
        ], result.orderItems.map((item) => [
            item.product || 'Sin producto',
            item.quantity,
            item.status || 'Sin estado',
        ]));

        const name = String(result.guide || result.name || order_id).replace(/[^\w-]+/g, '_');
        await sendWorkbook(res, wb, `pedido_${name}.xlsx`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateOrderExcel,
};
