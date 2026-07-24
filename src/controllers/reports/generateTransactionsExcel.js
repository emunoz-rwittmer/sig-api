const xl = require("excel4node");
const { formatDateToLocal } = require("../../utils/dateFormat");
const Utils = require("../../utils/Utils");
const WarehouseService = require("../../services/operations/inventory/warehouse.services");

const generateTransactionsExcel = async (req, res) => {
    try {

        var fechaActual = new Date();

        var wb = new xl.Workbook({
            dateFormat: "dd/mm/yyyy hh:mm:ss",
        });
        var ws = wb.addWorksheet("pedidos");

        const stockId = Utils.decode(req.params.stock_id);
        const result = await WarehouseService.getStockProduct(stockId);
        const transactions = result?.product?.transactions

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
            .string(`Producto ${result.product?.name}`)
            .style(titleStyle);
        ws.cell(3, 1, 3, 6, true)
            .string(`Empresa ${result.company?.name || 'N/A'}`)
            .style(titleStyle);
        ws.cell(4, 1, 4, 6, true)
            .string(`Bodega ${result.warehouse?.name}`)
            .style(titleStyle);
        ws.cell(5, 1, 5, 6, true)
            .string(formatDateToLocal(fechaActual))
            .style(titleStyle);

        // CABECERA DETALLE 
        ws.cell(7, 1).string("Fecha").style(headerLeftWrapStyle);
        ws.cell(7, 2).string("Responsable").style(headerLeftWrapStyle);
        ws.cell(7, 3).string("Tipo").style(headerLeftWrapStyle);
        ws.cell(7, 4).string("Bodega destino").style(headerLeftWrapStyle);
        ws.cell(7, 5).string("Cantidad").style(headerLeftWrapStyle);



        //SHOW DATA - Revisa el array result.orderItems usando forEach
        transactions.forEach((item, index) => {
            ws.cell(8 + index, 1).string(formatDateToLocal(item.createdAt) || "No definido");
            ws.cell(8 + index, 2).string(item.responsible?.firstName + " " + item.responsible?.lastName || "No definido");
            ws.cell(8 + index, 3).string(item.type || "No definido");
            ws.cell(8 + index, 4).string(item.warehouseTo?.name || "No definido");
            ws.cell(8 + index, 5).string(item.quantity.toString() || "0");
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