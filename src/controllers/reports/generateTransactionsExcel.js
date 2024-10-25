const xl = require("excel4node");
const { formatDateToLocal } = require("../../utils/Utils");
const ReportService = require("../../services/reports/reports.services");
const Utils = require("../../utils/Utils");
const WarehouseService = require("../../services/operations/inventory/warehouse.services");

const generateTransactionsExcel = async (req, res) => {
    try {

        var fechaActual = new Date();
        
        var wb = new xl.Workbook({
            dateFormat: "dd/mm/yyyy hh:mm:ss",
        });
        var ws = wb.addWorksheet("pedidos");

        const warehouseId = Utils.decode(req.params.warehouse_id);
        const { startDate, endDate, type } = req.query
        const warehouse = await WarehouseService.getWarehouseById(warehouseId);
        const result = await ReportService.getTransactionsReport(warehouseId, startDate, endDate, type);

        if (!result || result === 0) {
            return res.status(400).json({ message: "No hay items en la orden." });
        }

        //COLUMNS
        ws.column(1).setWidth(25);
        ws.column(2).setWidth(40);
        ws.column(3).setWidth(30);
        ws.column(4).setWidth(30);
        ws.column(5).setWidth(15);
        ws.column(6).setWidth(15);

        var titleStyle = wb.createStyle({
            alignment: {
                horizontal: ["center"],
            },
            fill: {
                type: "pattern",
            },
            font: {
                color: "000000",
                size: 15,
            },
        });

        var headerLeftWrapStyle = wb.createStyle({
            alignment: {
                wrapText: true,
                horizontal: "center",
            },
            fill: {
                type: "pattern",
                patternType: "solid",
                fgColor: "2C70BB",
            },
            font: {
                bold: true,
                color: "ffffff",
                size: 12,
            },
        });

        //TITULOS
        ws.cell(1, 1, 1, 6, true)
            .string("Reporte de transacciones")
            .style(titleStyle);
        ws.cell(2, 1, 2, 6, true)
            .string(`Bodega ${warehouse.name}`)
            .style(titleStyle);
        ws.cell(3, 1, 3, 6, true)
            .string(formatDateToLocal(fechaActual))
            .style(titleStyle);

        //SUBTITULOS
        ws.cell(5, 1, 5, 6, true)
            .string(`RANGO DE FECHAS: ${startDate} - ${endDate}`)

        // CABECERA DETALLE 
        ws.cell(6, 1).string("Fecha").style(headerLeftWrapStyle);
        ws.cell(6, 2).string("Responsable").style(headerLeftWrapStyle);
        ws.cell(6, 3).string("Tipo").style(headerLeftWrapStyle);
        ws.cell(6, 4).string("Producto").style(headerLeftWrapStyle);
        ws.cell(6, 5).string("Bodega destino").style(headerLeftWrapStyle);
        ws.cell(6, 6).string("Cantidad").style(headerLeftWrapStyle);



        //SHOW DATA - Revisa el array result.orderItems usando forEach
        result.forEach((item, index) => {
            ws.cell(7 + index, 1).string(formatDateToLocal(item.createdAt) || "No definido");
            ws.cell(7 + index, 2).string(item.responsible?.firstName + " " + item.responsible?.lastName || "No definido");
            ws.cell(7 + index, 3).string(item.type || "No definido");
            ws.cell(7 + index, 4).string(item.product?.name || "No definido");
            ws.cell(7 + index, 5).string(item.warehouseTo?.name || "No definido");
            ws.cell(7 + index, 6).string(item.quantity.toString() || "0");
        });

        //GENERATE EXCEL
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=Reporte.xlsx'
        );
        wb.write(`report.xlsx`, res);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }

}

module.exports = {
    generateTransactionsExcel,
}