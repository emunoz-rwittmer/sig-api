const xl = require("excel4node");
const path = require("path");
const fs = require("fs");
const { formatDateToLocal } = require('../../utils/Utils');
const ComentCardService = require("../../services/operations/comentCard/comentCard.services");
const Utils = require("../../utils/Utils");

const generateReportComentCards = async (req, res) => {
    try {
        const fechaActual = new Date();
        const options = { day: "2-digit", month: "2-digit", year: "numeric" };
        const fechaFormateada = (date) => date.toLocaleDateString("es-ES", options);

        const wb = new xl.Workbook();
        const ws = wb.addWorksheet("reporte general");

        const yachtId = Utils.decode(req.params.yacht_id);
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const result = await ComentCardService.getReportingByYacht(yachtId, startDate, endDate);
        if (!result || result.length === 0) {
            return res.status(400).json("No hay registros.");
        }

        const titleStyle = wb.createStyle({
            alignment: { horizontal: "center" },
            font: { color: "000000", size: 15 },
        });

        const headerStyle = wb.createStyle({
            font: { bold: true, color: "#ffffff" },
            alignment: { wrapText: true, horizontal: "center" },
            fill: { type: "pattern", patternType: "solid", fgColor: "2C70BB" },
        });

        const infoStyle = wb.createStyle({
            font: { color: "#000000" },
        });

        const allQuestions = [];
        result.forEach(entry => {
            (entry.respuestas || []).forEach(f => {
                const question = { id: f.pregunta?.id, title: f.pregunta?.text };
                if (question.id && !allQuestions.some(q => q.id === question.id)) {
                    allQuestions.push(question);
                }
            });
        });

        const baseHeaders = [
            "ID	",
            "Fecha contestación",
            "Yate",
            "Pasajero",
            "Cabina",
            "Fecha inicio crucero",
            "Fecha fin crucero",
        ];

        const defaultWidths = [10, 25, 30, 35, 10, 25, 25];
        defaultWidths.forEach((w, i) => ws.column(i + 1).setWidth(w));

        baseHeaders.slice(7).forEach((_, i) => {
            ws.column(8 + i).setWidth(35);
        });

        baseHeaders.forEach((h, i) => {
            ws.cell(10, i + 1).string(h).style(headerStyle);
        });

        allQuestions.forEach((q, index) => {
            const col = baseHeaders.length + 1 + index;
            ws.column(col).setWidth(40);
            ws.cell(10, col).string(q.title || "Pregunta").style(headerStyle);
        });

        //ADD IMAGE
        ws.addImage({
            path: path.join(__dirname, `../../../uploads/companies/logo_rwittmer.png`),
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
                    col: 3, // Columna de final
                    colOff: 0, // Desplazamiento horizontal en celdas
                    row: 4, // Fila de final
                    rowOff: 0, // Desplazamiento vertical en celdas
                },
            },
        });

        ws.cell(5, 1, 5, 3, true).string('REPORTE GENERAL').style(titleStyle);
        ws.cell(6, 1, 6, 3, true).string(fechaFormateada(fechaActual)).style(titleStyle);

        if (startDate && endDate) {
            ws.cell(7, 1, 7, 3, true).string(`RAGO DE FECHAS: ${formatDateToLocal(startDate) + " a " + formatDateToLocal(endDate) || 'Sin rangos definidos'}`)
        }
        ws.cell(8, 1, 9, 3, true).string(`COMMENT CARDS: ${result.length}`)

        baseHeaders.forEach((h, i) => {
            ws.cell(10, i + 1).string(h).style(headerStyle);
        });

        result.forEach((item, idx) => {
            const row = 11 + idx;
            const id = item.id || "";
            const fecha_contestacion = formatDateToLocal(item.createdAt) || "";
            const yate = item.coment_card.card_yacht.yate?.name || "";
            const pasajero = item.fullName || "";
            const cabina = item.cabin || "";
            const startDate = formatDateToLocal(item.coment_card?.startDate) || "";
            const endDate = formatDateToLocal(item.coment_card?.endDate) || "";

            // Datos base
            ws.cell(row, 1).number(id).style(infoStyle);
            ws.cell(row, 2).string(fecha_contestacion).style(infoStyle);
            ws.cell(row, 3).string(yate).style(infoStyle);
            ws.cell(row, 4).string(pasajero).style(infoStyle);
            ws.cell(row, 5).number(cabina).style(infoStyle);
            ws.cell(row, 6).string(startDate).style(infoStyle);
            ws.cell(row, 7).string(endDate).style(infoStyle);


            // === RESPUESTAS DINÁMICAS ===
            allQuestions.forEach((q, index) => {
                const col = baseHeaders.length + 1 + index;

                const respuestaObj = item.respuestas?.find(r => r.pregunta?.id === q.id);
                const respuesta = respuestaObj ? respuestaObj.answer : "Sin respuesta";

                if (typeof respuesta === "number") {
                    ws.cell(row, col).number(respuesta).style(infoStyle);
                } else {
                    ws.cell(row, col).string(String(respuesta)).style(infoStyle);
                }
            });

        });

        // === GENERAR Y ENVIAR ===
        const fileName = "Reporte_Comments_Cards.xlsx";
        const filePath = path.join(__dirname, fileName);
        wb.write(filePath, () => {
            res.download(filePath, fileName, err => {
                if (err) {
                    console.error("Error al enviar archivo:", err);
                    res.status(500).send("Error al descargar el archivo.");
                }
                fs.unlink(filePath, () => { });
            });
        });
    } catch (error) {
        console.error("Error al generar Excel:", error);
        res.status(500).json({ error: error.message });
    }

}

module.exports = {
    generateReportComentCards,
}