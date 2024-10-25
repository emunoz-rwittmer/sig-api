const path = require('path');
const xl = require("excel4node");
const Utils = require("../../utils/Utils");
const ReportService = require("../../services/reports/reports.services");
const WarehouseService = require('../../services/operations/inventory/warehouse.services');

const generateRequestExcel = async (req, res) => {
    try {
        var fechaActual = new Date();
        var options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const fechaFormateada = (date) => {
            const formattedDate = date.toLocaleDateString('es-ES', options);
            return formattedDate;
        }

        var wb = new xl.Workbook({
            dateFormat: "dd/mm/yyyy hh:mm:ss",
        });
        var ws = wb.addWorksheet("pedidos");

        const requestId = Utils.decode(req.params.request_id);
        const result = await ReportService.getRequestReport(requestId);
        const warehouse = await WarehouseService.getWarehouseById(result.warehouseId);

console.log(result)
        // Verifica que result.orderItems no esté vacío o undefined
        if (!result.requestItems || result.requestItems.length === 0) {
            return res.status(400).json({ message: "No hay items en la orden." });
        }

        //COLUMNS
        ws.column(1).setWidth(25);
        ws.column(2).setWidth(40);
        ws.column(3).setWidth(30);
        ws.column(4).setWidth(30);
        ws.column(5).setWidth(15);
        ws.column(6).setWidth(15);

        //ADD IMAGE
       
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
        ws.cell(3, 1, 3, 4, true)
            .string('Reporte de perdidos')
            .style(titleStyle);
        ws.cell(4, 1, 4, 4, true)
            .string(warehouse.name)
            .style(titleStyle);
        ws.cell(5, 1, 5, 4, true)
            .string(fechaFormateada(fechaActual))
            .style(titleStyle);

        //SUBTITULOS

        ws.cell(8, 1, 8, 4, true)
            .string(`NOMBRE PEDIDO: ${result.name}`)
        ws.cell(9, 1, 9, 4, true)
            .string(`SOLICITANTE: ${result.responsible?.firstName + " " + result.responsible?.lastName}`)
        ws.cell(10, 1, 10, 4, true)
            .string(`ESTATUS: ${result.status}`)
        ws.cell(11, 1, 11, 4, true)
            .string(`FECHA DE SOLICITUD: ${fechaFormateada(result.createdAt)}`)


        // CABECERA DETALLE 
        ws.cell(13, 1).string("Producto").style(headerLeftWrapStyle);
        ws.cell(13, 2).string("Stock").style(headerLeftWrapStyle);
        ws.cell(13, 3).string("Solicitado").style(headerLeftWrapStyle);
        ws.cell(13, 4).string("Despachado").style(headerLeftWrapStyle);


        //SHOW DATA - Revisa el array result.orderItems usando forEach
        result.requestItems.forEach((item, index) => {
            ws.cell(14 + index, 1).string(item.product.name || "Sin producto");
            ws.cell(14 + index, 2).string(item.stock.toString() || "0");
            ws.cell(14 + index, 3).string(item.order.toString() || "0");
            ws.cell(14 + index, 4).string(item.quantity || "0");
        });

        //GENERATE EXCEL
        // Genera el archivo y lo envía como respuesta
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
    generateRequestExcel,
}