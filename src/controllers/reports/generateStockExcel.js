const xl = require("excel4node");
const AppError = require("../../errors/AppError");

const generateStockExcel = async (req, res, next) => {
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

        if (!Array.isArray(data?.products)) {
            throw new AppError('products es requerido', 400);
        }

        const getObservation = (quantity, min, max) => {
            if (quantity < min) {
                return {
                    text: '🔴 ⚠️ Hay que ingresar stock',
                    color: 'FF4C4C'
                };
            }

            if (quantity <= (min + 5)) {
                return {
                    text: '🟡 ⚠️ Stock debe ser atendido',
                    color: 'FFD966'
                };
            }

            if (quantity > max) {
                return {
                    text: '🔵 📦 Exceso de stock',
                    color: '9BC2E6'
                };
            }

            return {
                text: '🟢 ✅ Stock OK',
                color: 'C6E0B4'
            };
        };

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
        ws.cell(5, 4).string("Stock Maximo").style(headerLeftWrapStyle);
        ws.cell(5, 5).string("Stock Minimo").style(headerLeftWrapStyle);
        ws.cell(5, 6).string("Entradas").style(headerLeftWrapStyle);
        ws.cell(5, 7).string("Salidas").style(headerLeftWrapStyle);
        ws.cell(5, 8).string("Observación").style(headerLeftWrapStyle);


        //SHOW DATA - Revisa el array result.orderItems usando forEach
        data.products.forEach((item, index) => {
            const row = 6 + index;

            const quantity = Number(item.quantity || 0);
            const min = Number(item.min || 0);
            const max = Number(item.max || 0);

            const observation = getObservation(quantity, min, max);

            // estilo dinámico
            const obsStyle = wb.createStyle({
                fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    fgColor: observation.color
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                    wrapText: true
                },
                font: {
                    bold: true,
                    size: 11,
                    color: '000000'
                },
                border: {
                    left: { style: 'thin' },
                    right: { style: 'thin' },
                    top: { style: 'thin' },
                    bottom: { style: 'thin' }
                }
            });

            ws.cell(row, 1).string(item.sku || "Sin producto");
            ws.cell(row, 2).string(item.name || "Sin producto");
            ws.cell(row, 3).number(quantity);
            ws.cell(row, 4).number(max);
            ws.cell(row, 5).number(min);
            ws.cell(row, 6).string(item.totalIncome || 0);
            ws.cell(row, 7).string(item.totalOutcome || 0);

            // 🔥 OBSERVACIÓN CON COLOR
            ws.cell(row, 8)
                .string(observation.text)
                .style(obsStyle);
        });

        //GENERATE EXCEL
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=Reporte.xlsx'
        );
        wb.write(`report.xlsx`, res);
    } catch (error) {
        next(error);
    }

}

module.exports = {
    generateStockExcel,
}