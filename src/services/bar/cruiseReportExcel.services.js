const { createReport, saveWorkbook, formatDay } = require('../../utils/excelReport');
const { writeBarSheets } = require('./consumerCardReportExcel.services');

// `passengers` ya viene filtrado por el controlador (consumer card pagada y con consumo).
exports.generateCruiseReportExcel = async (cruise, passengers, cortecyCards = [], filePath) => {
    try {
        const { wb, st } = createReport();
        const consumerCards = passengers
            .filter((passenger) => passenger.consumer_card)
            .map((passenger) => ({
                ...passenger.consumer_card,
                passenger: {
                    ...passenger,
                    cruise,
                    cruiseStartDate: passenger.cruiseStartDate || cruise.startDate,
                    cruiseEndDate: passenger.cruiseEndDate || cruise.endDate,
                },
            }));

        writeBarSheets(wb, st, {
            consumerCards,
            cortecyCards: cortecyCards.map((card) => ({ ...card, cruise })),
            subtitle: `Crucero ${cruise.code} · Yate ${cruise.yacht?.name || 'N/A'} · Del ${formatDay(cruise.startDate)} al ${formatDay(cruise.endDate)}`,
            logo: cruise.yacht?.company?.logo,
            footer: `Reporte del crucero ${cruise.code}`,
        });
        return await saveWorkbook(wb, filePath);
    } catch (error) {
        console.error('Error escribiendo archivo de reporte de crucero:', error);
        throw error;
    }
};
