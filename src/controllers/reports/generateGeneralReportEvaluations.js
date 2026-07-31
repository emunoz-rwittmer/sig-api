const xl = require("excel4node");
const path = require("path");
const fs = require("fs");
const { formatDateToLocal } = require('../../utils/dateFormat');
const EvaluationService = require('../../services/operations/surveys/evaluations.services');
const Utils = require('../../utils/Utils');
const SurveyScoring = require('../../utils/surveyScoring');
const AppError = require('../../errors/AppError');
const Staffervice = require('../../services/catalogs/staff.services');
const { extractApellido, capitalizeYachtName, extractNombres } = require('../../utils/reportFormatting');

const decodeId = (value, fieldName) => {
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

const generateGeneralReportEvaluations = async (req, res, next) => {
    try {
        const fechaActual = new Date();
        const options = { day: "2-digit", month: "2-digit", year: "numeric" };
        const fechaFormateada = (date) => date.toLocaleDateString("es-ES", options);

        const wb = new xl.Workbook();
        const ws = wb.addWorksheet("reporte general");

        const companyId = decodeId(req.params.company_id, 'company_id');
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const result = await EvaluationService.getEvaluationsByCompany(companyId, startDate, endDate)
        if (!result || result.length === 0) {
            throw new AppError('No hay registros.', 400);
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

        const dateStyle = wb.createStyle({
            font: { color: "#000000" },
            numberFormat: "dd/mm/yyyy",
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
            "Cargo",
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
                        col: 2, // Columna de final
                        colOff: 0, // Desplazamiento horizontal en celdas
                        row: 6, // Fila de final
                        rowOff: 0, // Desplazamiento vertical en celdas
                    },
                },
            });
        }

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

        // === RESOLVER CARGO DEL EVALUADO (una sola consulta batch, nombre+apellido) ===
        const uniqueEvaluados = [...new Set(result.map(item => item.evaluated).filter(Boolean))];

        const namePairs = uniqueEvaluados
            .map(evaluado => ({
                fullName: evaluado,
                firstName: extractNombres(evaluado),
                lastName: extractApellido(evaluado),
            }))
            .filter(({ firstName, lastName }) => firstName && lastName);

        const cargoByFullName = await Staffervice.getPositionsByFullNames(
            namePairs.map(({ firstName, lastName }) => ({ firstName, lastName }))
        );

        const cargoMap = new Map(
            namePairs.map(({ fullName, firstName, lastName }) => [
                fullName,
                cargoByFullName.get(`${firstName} ${lastName}`) || null,
            ])
        );

        // === CONTENIDO ===
        // Llenar las filas con los datos
        result.forEach((item, idx) => {
            const row = 11 + idx; // Fila donde empieza la data
            const formulario = item.formulario?.name || "Sin Datos";
            const evaluador = item.evaluator;
            const evaluado = item.evaluated;
            const cargo = cargoMap.get(evaluado) || "Sin Datos";
            const yate = capitalizeYachtName(item.empresa?.yacht?.name) || "N/A";
            const fecha = item.updatedAt;
            const estado = item.state || "Sin Datos";

            // Datos base
            ws.cell(row, 1).string(formulario).style(infoStyle);
            ws.cell(row, 2).string(evaluador).style(infoStyle);
            ws.cell(row, 3).string(evaluado).style(infoStyle);
            ws.cell(row, 4).string(cargo).style(infoStyle);
            ws.cell(row, 5).string(yate).style(infoStyle);
            if (fecha === null || fecha === undefined) {
                ws.cell(row, 6).string("Sin Datos").style(infoStyle);
            } else {
                ws.cell(row, 6).date(fecha).style(dateStyle);
            }
            ws.cell(row, 7).string(estado).style(infoStyle);

            // Obtén todas las respuestas de la evaluación
            const respuestas = item.respuestas?.map(r => SurveyScoring.asignarPuntaje(r.answer)) || [];

            // Llenar las 10 columnas de respuestas, respetando el tipo (numero vs texto)
            for (let i = 0; i < 10; i++) {
                const respuesta = respuestas[i];
                if (respuesta === null || respuesta === undefined || respuesta === '') {
                    ws.cell(row, 8 + i).string('').style(infoStyle);
                } else if (typeof respuesta === 'number') {
                    ws.cell(row, 8 + i).number(respuesta).style(infoStyle);
                } else {
                    ws.cell(row, 8 + i).string(String(respuesta)).style(infoStyle);
                }
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
        next(error);
    }

}

module.exports = {
    generateGeneralReportEvaluations,
}