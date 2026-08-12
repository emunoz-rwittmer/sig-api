const xl = require("excel4node");
const path = require("path");
const fs = require("fs");
const { formatDateToLocal } = require('../../utils/dateFormat');
const ComentCardService = require("../../services/operations/comentCard/comentCard.services");
const Utils = require("../../utils/Utils");
const AppError = require("../../errors/AppError");

const decodeId = (value, fieldName) => {
    if (!value || value === 'undefined' || value === 'null') {
        return undefined;
    }
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

const generateReportComentCards = async (req, res, next) => {
    try {
        const fechaActual = new Date();
        const options = { day: "2-digit", month: "2-digit", year: "numeric" };
        const fechaFormateada = (date) => date.toLocaleDateString("es-ES", options);

        const wb = new xl.Workbook();
        const ws = wb.addWorksheet("reporte general");

        const yachtId = decodeId(req.params.yacht_id, 'yacht_id');
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const result = await ComentCardService.getReportingByYacht(yachtId, startDate, endDate);
        if (!result || result.length === 0) {
            throw new AppError('No hay registros.', 400);
        }

        const COLORS = {
            primary: '1F4E79',   // azul corporativo
            secondary: 'D9E1F2', // azul claro
            headerText: 'FFFFFF',
            border: 'B4C6E7',
            zebra: 'FFFFFF',
        };

        const titleStyle = wb.createStyle({
            font: {
                bold: true,
                size: 18,
                color: COLORS.primary,
            },
            alignment: {
                horizontal: 'left',
                vertical: 'center',
            },
        });

        const subtitleStyle = wb.createStyle({
            font: {
                size: 11,
                color: '333333',
            },
            alignment: {
                horizontal: 'left',
            },
        });

        const headerStyle = wb.createStyle({
            font: {
                bold: true,
                color: COLORS.headerText,
                size: 11,
            },
            alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true,
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                fgColor: COLORS.primary,
            },
            border: {
                left: { style: 'thin', color: COLORS.border },
                right: { style: 'thin', color: COLORS.border },
                top: { style: 'thin', color: COLORS.border },
                bottom: { style: 'thin', color: COLORS.border },
            },
        });

        const infoStyle = wb.createStyle({
            font: { size: 10, color: '000000' },
            alignment: {
                vertical: 'center',
                wrapText: true,
            },
            border: {
                left: { style: 'thin', color: COLORS.border },
                right: { style: 'thin', color: COLORS.border },
                top: { style: 'thin', color: COLORS.border },
                bottom: { style: 'thin', color: COLORS.border },
            },
        });

        const infoZebraStyle = wb.createStyle({
            font: { size: 10, color: '000000' },
            alignment: {
                vertical: 'center',
                wrapText: true,
            },
            fill: {
                type: 'pattern',
                patternType: 'solid',
                fgColor: COLORS.zebra,
            },
            border: {
                left: { style: 'thin', color: COLORS.border },
                right: { style: 'thin', color: COLORS.border },
                top: { style: 'thin', color: COLORS.border },
                bottom: { style: 'thin', color: COLORS.border },
            },
        });

        const allQuestions = [];
        result.forEach(entry => {
            (entry.respuestas || []).forEach(f => {
                const question = { id: f.pregunta?.id, title: f.pregunta?.title };
                if (question.id && !allQuestions.some(q => q.id === question.id)) {
                    allQuestions.push(question);
                }
            });
        });

        const baseHeaders = [
            "Codigo Crucero",
            "Crucero",
            "Yate",
            "Pasajero",
            "Cabina",
            "Fecha contestación",
            "Fecha inicio crucero",
            "Fecha fin crucero",
        ];

        const defaultWidths = [10, 30, 25, 30, 10, 25, 25, 25];
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
        const logoPath = path.join(__dirname, `../../../uploads/companies/logo_rwittmer.png`);
        if (fs.existsSync(logoPath)) {
            ws.addImage({
                path: logoPath,
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
        }

        ws.cell(5, 1, 5, baseHeaders.length + allQuestions.length, true)
            .string('REPORTE GENERAL DE COMMENT CARDS')
            .style(titleStyle);

        ws.cell(6, 1, 6, baseHeaders.length + allQuestions.length, true)
            .string(fechaFormateada(fechaActual))
            .style(subtitleStyle);

        if (startDate && endDate) {
            ws.cell(7, 1, 7, baseHeaders.length + allQuestions.length, true)
                .string(`RANGO DE FECHAS: ${formatDateToLocal(startDate)} a ${formatDateToLocal(endDate)}`)
                .style(subtitleStyle);
        }

        ws.cell(8, 1, 8, baseHeaders.length + allQuestions.length, true)
            .string(`TOTAL COMMENT CARDS: ${result.length}`)
            .style(subtitleStyle);

        baseHeaders.forEach((h, i) => {
            ws.cell(10, i + 1).string(h).style(headerStyle);
        });

        result.forEach((item, idx) => {
            const row = 11 + idx;
            const style = idx % 2 === 0 ? infoZebraStyle : infoStyle;
            const id = item.coment_card?.code || "";
            const cruise = item.coment_card?.name || "";
            const yate = item.coment_card.card_yacht.yate?.name || "";
            const pasajero = item.fullName || "";
            const cabina = item.cabin || "";
            const fecha_contestacion = formatDateToLocal(item.createdAt) || "";
            const startDate = formatDateToLocal(item.coment_card?.startDate) || "";
            const endDate = formatDateToLocal(item.coment_card?.endDate) || "";

            // Datos base
            ws.cell(row, 1).string(id).style(style);
            ws.cell(row, 2).string(cruise).style(style);
            ws.cell(row, 3).string(yate).style(style);
            ws.cell(row, 4).string(pasajero).style(style);
            ws.cell(row, 5).number(cabina).style(style);
            ws.cell(row, 6).string(fecha_contestacion).style(style);
            ws.cell(row, 7).string(startDate).style(style);
            ws.cell(row, 8).string(endDate).style(style);


            // === RESPUESTAS DINÁMICAS ===
            allQuestions.forEach((q, index) => {
                const col = baseHeaders.length + 1 + index;

                const respuestaObj = item.respuestas?.find(r => r.pregunta?.id === q.id);
                const respuesta = respuestaObj ? respuestaObj.answer : "Sin respuesta";

                if (typeof respuesta === "number") {
                    ws.cell(row, col).number(respuesta).style(style);
                } else {
                    ws.cell(row, col).string(String(respuesta)).style(style);
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
        next(error);
    }

}

module.exports = {
    generateReportComentCards,
}