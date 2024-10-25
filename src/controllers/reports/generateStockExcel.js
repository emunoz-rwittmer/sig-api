const xl = require("excel4node");

const generateStockExcel = async (req, res) => {
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

        const data = req.body

        if (!data || data === 0) {
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
        ws.cell(1, 1, 1, 5, true)
            .string("Reporte Stock")
            .style(titleStyle);
        ws.cell(2, 1, 2, 5, true)
            .string(`Bodega ${data.warehouseName}`)
            .style(titleStyle);
        ws.cell(3, 1, 3, 5, true)
            .string(fechaFormateada(fechaActual))
            .style(titleStyle);

        // CABECERA DETALLE 
        ws.cell(5, 1).string("Sku").style(headerLeftWrapStyle);
        ws.cell(5, 2).string("Producto").style(headerLeftWrapStyle);
        ws.cell(5, 3).string("Stock").style(headerLeftWrapStyle);
        ws.cell(5, 4).string("Entradas").style(headerLeftWrapStyle);
        ws.cell(5, 5).string("Salidas").style(headerLeftWrapStyle);


        //SHOW DATA - Revisa el array result.orderItems usando forEach
        data.products.forEach((item, index) => {
            ws.cell(6 + index, 1).string(item.sku || "Sin producto");
            ws.cell(6 + index, 2).string(item.name || "Sin producto");
            ws.cell(6 + index, 3).string(item.quantity.toString() || "0");
            ws.cell(6 + index, 4).string(item.totalIncome || "0");
            ws.cell(6 + index, 5).string(item.totalOutcome || "0");
        });

        //GENERATE EXCEL
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
    generateStockExcel,
}