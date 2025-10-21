const xl = require("excel4node");
const path = require("path");
const fs = require("fs");
const { formatDateToLocal } = require('../../utils/Utils');
const EvaluationService = require('../../services/operations/surveys/evaluations.services');
const Utils = require('../../utils/Utils');

const generateGeneralReportEvaluations = async (req, res) => {
    try {
        const fechaActual = new Date();
        const options = { day: "2-digit", month: "2-digit", year: "numeric" };
        const fechaFormateada = (date) => date.toLocaleDateString("es-ES", options);

        const wb = new xl.Workbook();
        const ws = wb.addWorksheet("reporte general");

        const yachtId = Utils.decode(req.params.yacht_id);
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const result = await EvaluationService.getEvaluationsByYacht(yachtId, startDate, endDate)
        if (!result || result.length === 0) {
            return res.status(400).json("No hay registros.");
        }

        // === COLORES POR FORMULARIO ===
        const colors = ["FFD966", "C9DAF8", "D9EAD3", "F4CCCC", "EAD1DC", "FFF2CC"];

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

        const formTitleStyles = colors.map(color =>
            wb.createStyle({
                fill: { type: "pattern", patternType: "solid", fgColor: color },
                alignment: { horizontal: "center" },
                font: { bold: true, color: "#000000" },
            })
        );

        // === MAPEO DE FORMULARIOS Y PREGUNTAS ===
        const formMap = new Map();
        result.forEach(entry => {
            const formName = entry?.header_form?.title;
            if (!formMap.has(formName)) {
                formMap.set(formName, []);
            }
            (entry.answer_header || []).forEach(f => {
                const question = { id: f.aswer_question?.id, title: f.aswer_question?.pregunta };
                if (question.id && !formMap.get(formName).some(q => q.id === question.id)) {
                    formMap.get(formName).push(question);
                }
            });
        });

        const formNames = Array.from(formMap.keys());

        // === ANCHOS DE COLUMNA ===
        const baseHeaders = [
            "Formulario	",
            "Evaluador",
            "Evaluado",
            "Cargo Evaluado",
            "Yate",
            "Fecha",
            "Estado",
        ];

        const defaultWidths = [40, 35, 35, 15, 20, 18, 20];
        defaultWidths.forEach((w, i) => ws.column(i + 1).setWidth(w));

        // columnas dinámicas
        let dynamicCol = baseHeaders.length + 1;
        formNames.forEach(form => {
            const preguntas = formMap.get(form) || [];
            preguntas.forEach((_, i) => {
                ws.column(dynamicCol + i).setWidth(35);
            });
            dynamicCol += preguntas.length;
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
                    col: 2, // Columna de final
                    colOff: 0, // Desplazamiento horizontal en celdas
                    row: 5, // Fila de final
                    rowOff: 0, // Desplazamiento vertical en celdas
                },
            },
        });

        //TITULOS
        ws.cell(3, 1, 3, 3, true).string('REPORTE GENERAL DE DESEMPEÑO').style(titleStyle);
        ws.cell(4, 1, 4, 3, true).string(result[0].header_yacht?.name).style(titleStyle);
        ws.cell(5, 1, 5, 3, true).string(fechaFormateada(fechaActual)).style(titleStyle);

        //SUBTITULOS
        ws.cell(7, 1, 7, 3, true).string(`RAGO DE FECHAS: ${formatDateToLocal(startDate) + " a " + formatDateToLocal(endDate)}`)
        ws.cell(8, 1, 9, 3, true).string(`EVALUACIONES: ${result.length}`)

        // === CABECERAS ===
        // Nivel 1: Datos base
        baseHeaders.forEach((h, i) => {
            ws.cell(10, i + 1, 12, i + 1, true).string(h).style(headerStyle);
        });

        // Nivel 2: Nombre del formulario (colspan de sus preguntas + 1 para la fecha)
        let colOffset = baseHeaders.length + 1;
        formNames.forEach((name, idx) => {
            const questions = formMap.get(name);
            const totalCols = questions.length;

            // Título del formulario (colspan ajustado)
            ws.cell(10, colOffset, 10, colOffset + totalCols - 1, true)
                .string(name)
                .style(formTitleStyles[idx % formTitleStyles.length]);

            // Nivel 3: Preguntas
            questions.forEach((q, i) => {
                ws.cell(11, colOffset + i).string(q.title).style(headerStyle);
                ws.cell(12, colOffset + i).string("Respuesta").style(headerStyle);
            });

            // Avanzamos el offset para el siguiente formulario
            colOffset += totalCols;
        });


        // === CONTENIDO ===
        result.forEach((item, idx) => {
            const row = 13 + idx;
            const formulario = item.header_form?.title || {};
            const evaluador = `${item.header_evaluator.dataValues?.first_name || ""} ${item.header_evaluator.dataValues?.last_name || ""}`;
            const evaluado = `${item.header_evaluted.dataValues?.first_name || ""} ${item.header_evaluted.dataValues?.last_name || ""}`;
            const cargo = item.header_evaluted?.staff_position.name || {};
            const yate = item.header_yacht?.name || {};
            const fecha = formatDateToLocal(item.updatedAt) || {};
            const estado = item.state.state || {};

            // Datos personales
            ws.cell(row, 1).string(formulario || "Sin Datos").style(infoStyle);
            ws.cell(row, 2).string(evaluador || "Sin Datos").style(infoStyle);
            ws.cell(row, 3).string(evaluado || "Sin Datos").style(infoStyle);
            ws.cell(row, 4).string(cargo || "Sin Datos").style(infoStyle);
            ws.cell(row, 5).string(yate || "Sin Datos").style(infoStyle);
            ws.cell(row, 6).string(fecha || "Sin Datos").style(infoStyle);
            ws.cell(row, 7).string(estado || "Sin Datos").style(infoStyle);

            // Respuestas
            let col = baseHeaders.length + 1;
            formNames.forEach(formName => {
                const questions = formMap.get(formName);
                questions.forEach(q => {
                    const r = item.answer_header?.find(r => r.aswer_question.id === q.id);
                    //const value = r?.answer ? Utils.asignarPuntaje(r.answer) : "Sin respuesta";
                    ws.cell(row, col++).string(String(r?.answer || "")).style(infoStyle);
                });
            });
        });

        // === GENERAR Y ENVIAR ===
        const fileName = "Reporte_Evaluaciones.xlsx";
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
    generateGeneralReportEvaluations,
}