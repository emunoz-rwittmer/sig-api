const path = require('path');
const fs = require('fs');
const xl = require("excel4node");
const { formatDateToLocal } = require('../../utils/dateFormat');
const AppError = require('../../errors/AppError');

const generatReportEvaluationsByEmployed = async (req, res, next) => {
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
        var ws = wb.addWorksheet("general report");

        const { reportingEvaluationsByCrewState, dataForReport } = req.body

        if (!Array.isArray(dataForReport?.averageReviews)) {
            throw new AppError('dataForReport.averageReviews es requerido', 400);
        }

        //COLUMNS
        ws.column(1).setWidth(25);
        ws.column(2).setWidth(40);
        ws.column(3).setWidth(30);
        ws.column(4).setWidth(30);
        ws.column(5).setWidth(15);
        ws.column(6).setWidth(15);

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
                        row: 5, // Fila de final
                        rowOff: 0, // Desplazamiento vertical en celdas
                    },
                },
            });
        }
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
            .string('REPORTE GENERAL DE DESEMPEÑO')
            .style(titleStyle);
        ws.cell(5, 1, 5, 3, true)
            .string(fechaFormateada(fechaActual))
            .style(titleStyle);

        //SUBTITULOS
        ws.cell(7, 1, 7, 3, true)
            .string(`RAGO DE FECHAS: ${formatDateToLocal(dataForReport.startDate) + " a " + formatDateToLocal(dataForReport.endDate)}`)
        ws.cell(8, 1, 8, 3, true)
            .string(`PERSONA EVALUADA: ${reportingEvaluationsByCrewState.crew?.first_name+" "+reportingEvaluationsByCrewState.crew?.last_name}`)
        ws.cell(9, 1, 9, 3, true)
            .string(`CARGO: ${reportingEvaluationsByCrewState.crew?.staff_position?.name}`)
        ws.cell(10, 1, 10, 3, true)
            .string(`EVALUACIONES: ${dataForReport.averageReviews.length}`)
        ws.cell(11, 1, 11, 3, true)
            .string(`PUNTUACIÓN: ${dataForReport.averageGeneral}`)


        // CABECERA DETALLE 
        ws.cell(13, 1).string("Fecha").style(headerLeftWrapStyle);
        ws.cell(13, 2).string("Yate").style(headerLeftWrapStyle);
        ws.cell(13, 3).string("Evaluado").style(headerLeftWrapStyle);
        ws.cell(13, 4).string("Evaluador").style(headerLeftWrapStyle);
        ws.cell(13, 5).string("Estatus").style(headerLeftWrapStyle);
        ws.cell(13, 6).string("Calificación").style(headerLeftWrapStyle);


        // //SHOW DATA - Revisa el array result.orderItems usando forEach
        dataForReport.averageReviews.forEach((evaluation, index) => {
            ws.cell(14 + index, 1).string(formatDateToLocal(evaluation.createdAt) || "Sin asignar");
            ws.cell(14 + index, 2).string(evaluation.header_yacht.name || "Sin asignar");
            ws.cell(14 + index, 3).string(reportingEvaluationsByCrewState.crew?.first_name+" "+reportingEvaluationsByCrewState.crew?.last_name || "Sin  asignar");
            ws.cell(14 + index, 4).string(evaluation.header_evaluator?.firstName + " " + evaluation.header_evaluator?.lastName || "Sin  asignar");
            ws.cell(14 + index, 5).string(evaluation.state.state || "Sin  asignar");
            ws.cell(14 + index, 6).string(evaluation.promedio.toString() || "Sin  asignar");
        });

        //GENERATE EXCEL
        // Genera el archivo y lo envía como respuesta
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
    generatReportEvaluationsByEmployed,
}