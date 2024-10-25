const path = require('path');
const xl = require("excel4node");
const Utils = require("../../utils/Utils");
const ReportService = require("../../services/reports/reports.services");

const generateOrderExcel = async (req, res) => {
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
        const order_id = Utils.decode(req.params.order_id);
        const result = await ReportService.getOrderReport(order_id);

        // Verifica que result.orderItems no esté vacío o undefined
        if (!result.orderItems || result.orderItems.length === 0) {
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
        ws.addImage({
            path: path.join(__dirname, `../../..${result.company?.logo}`),
            type: "picture",
            position: {
                type: 'twoCellAnchor',
                from: {
                    col: 1, // Columna de inicio
                    colOff: 0, // Desplazamiento horizontal en celdas
                    row: 1, // Fila de inicio
                    rowOff: 0, // Desplazamiento vertical en celdas
                },
                to: {
                    col: 2, // Columna de final
                    colOff: 0, // Desplazamiento horizontal en celdas
                    row: 5, // Fila de final
                    rowOff: 0, // Desplazamiento vertical en celdas
                },
            },
        });
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
        ws.cell(3, 1, 3, 3, true)
            .string(result.company?.name)
            .style(titleStyle);
        ws.cell(4, 1, 4, 3, true)
            .string(result.company?.ruc)
            .style(titleStyle);
        ws.cell(5, 1, 5, 3, true)
            .string(result.company?.adress)
            .style(titleStyle);
        ws.cell(6, 1, 6, 3, true)
            .string(fechaFormateada(fechaActual))
            .style(titleStyle);

        //SUBTITULOS
        ws.cell(7, 1, 7, 3, true)
            .string(`N° DE GUIA: ${result.guide}`)
        ws.cell(8, 1, 8, 3, true)
            .string(`NOMBRE PEDIDO: ${result.name}`)
        ws.cell(9, 1, 9, 3, true)
            .string(`SOLICITANTE: ${result.responsible?.firstName + " " + result.responsible?.lastName}`)
        ws.cell(10, 1, 10, 3, true)
            .string(`ESTATUS: ${result.status}`)
        ws.cell(11, 1, 11, 3, true)
            .string(`FECHA DE SOLICITUD: ${fechaFormateada(result.createdAt)}`)


        // CABECERA DETALLE 
        ws.cell(13, 1).string("Producto").style(headerLeftWrapStyle);
        ws.cell(13, 2).string("Cantidad").style(headerLeftWrapStyle);
        ws.cell(13, 3).string("Estatus").style(headerLeftWrapStyle);


        //SHOW DATA - Revisa el array result.orderItems usando forEach
        result.orderItems.forEach((item, index) => {
            ws.cell(14 + index, 1).string(item.product || "Sin producto");
            ws.cell(14 + index, 2).string(item.quantity.toString() || "0");
            ws.cell(14 + index, 3).string(item.status || "Sin estatus");
        });

        //GENERATE EXCEL
        // Genera el archivo y lo envía como respuesta
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=Reporte.xlsx'
        );
        wb.write(`report.xlsx`, res);
    } catch (error) {
        res.status(400).json(error.message)
    }

}

module.exports = {
    generateOrderExcel,
}