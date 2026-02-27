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

        const companyId = req.params.company_id ? Utils.decode(req.params.company_id) : null;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        const result = await EvaluationService.getEvaluationsByCompany(companyId, startDate, endDate)
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

        // // === MAPEO DE FORMULARIOS Y PREGUNTAS ===
        const allQuestions = [];
        result.forEach(entry => {
            (entry.respuestas || []).forEach(f => {
                const question = { id: f.pregunta?.id, title: f.pregunta?.title };
                if (question.id && !allQuestions.some(q => q.id === question.id)) {
                    allQuestions.push(question);
                }
            });
        });

        // === ANCHOS DE COLUMNA ===
        const baseHeaders = [
            "Formulario	",
            "Evaluador",
            "Evaluado",
            "Empresa",
            "Yate",
            "Fecha",
            "Estado",
            "Pregunta 1",
            "Pregunta 2",
            "Pregunta 3",
            "Pregunta 4",
            "Pregunta 5",
            "Pregunta 6",
            "Pregunta 7",
            "Pregunta 8",
            "Pregunta 9",
            "Pregunta 10",
        ];

        const defaultWidths = [40, 35, 35, 15, 20, 18, 20];
        defaultWidths.forEach((w, i) => ws.column(i + 1).setWidth(w));

        // Ajusta el ancho de las columnas dinámicas
        baseHeaders.slice(7).forEach((_, i) => {
            ws.column(8 + i).setWidth(35);
        });

        // Escribe los encabezados en el Excel
        baseHeaders.forEach((h, i) => {
            ws.cell(10, i + 1).string(h).style(headerStyle);
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
                    row: 6, // Fila de final
                    rowOff: 0, // Desplazamiento vertical en celdas
                },
            },
        });

        //TITULOS
        ws.cell(4, 1, 4, 4, true).string('REPORTE GENERAL DE DESEMPEÑO').style(titleStyle);
        ws.cell(5, 1, 5, 3, true).string(fechaFormateada(fechaActual)).style(titleStyle);

        //SUBTITULOS
        if (startDate !== 'null' && endDate !== 'null') {
            ws.cell(7, 1, 7, 3, true).string(`RAGO DE FECHAS: ${formatDateToLocal(startDate) + " a " + formatDateToLocal(endDate)}`)
        }

        ws.cell(8, 1, 9, 3, true).string(`EVALUACIONES: ${result.length}`)

        // === CABECERAS ===
        // Escribe los encabezados base y de preguntas
        baseHeaders.forEach((h, i) => {
            ws.cell(10, i + 1).string(h).style(headerStyle);
        });

        // === CONTENIDO ===
        // Llenar las filas con los datos
        result.forEach((item, idx) => {
            const row = 11 + idx; // Fila donde empieza la data
            const formulario = item.formulario?.name || "Sin Datos";
            const evaluador = item.evaluator;
            const evaluado = item.evaluated;
            const empresa = item.empresa?.name || "Sin Datos";
            const yate = item.empresa.yacht?.name || "N/A";
            const fecha = formatDateToLocal(item.updatedAt) || "Sin Datos";
            const estado = item.state || "Sin Datos";

            // Datos base
            ws.cell(row, 1).string(formulario).style(infoStyle);
            ws.cell(row, 2).string(evaluador).style(infoStyle);
            ws.cell(row, 3).string(evaluado).style(infoStyle);
            ws.cell(row, 4).string(empresa).style(infoStyle);
            ws.cell(row, 5).string(yate).style(infoStyle);
            ws.cell(row, 6).string(fecha).style(infoStyle);
            ws.cell(row, 7).string(estado).style(infoStyle);

            // Obtén todas las respuestas de la evaluación
            const respuestas = item.respuestas?.map(r => Utils.asignarPuntaje(r.answer)) || [];

            // Llenar las 10 columnas de respuestas
            for (let i = 0; i < 10; i++) {
                const respuesta = respuestas[i] || "Sin respuesta";
                ws.cell(row, 8 + i).string(String(respuesta)).style(infoStyle);
            }
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