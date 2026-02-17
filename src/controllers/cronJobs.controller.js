const ComentCardYacht = require('../models/operations/comentCard/cardYacht.models');
const ComentCardQR = require('../models/operations/comentCard/cardQR.models');
const axios = require('axios');
const Utils = require('../utils/Utils');

function getWeekRange() {
    const now = new Date();

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return { start, end };
}

function formatDateLocal(date) {
    const pad = (n) => n.toString().padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}


const generateWeeklyCruises = async (req, res) => {

    console.log('Ejecutando tarea semanal...');

    try {
        const { start, end } = getWeekRange();
        const startFormatted = formatDateLocal(start);
        const endFormatted = formatDateLocal(end);

        // 1️⃣ Obtener cruceros del microservicio
        const response = await axios.get(`http://localhost:3156/microservice/cruise?start=${startFormatted}&end=${endFormatted}`);
        const cruises = response.data;

        if (!cruises.length) {
            console.log('No hay cruceros para la semana');
            return;
        }

        // 3️⃣ Obtener yachts locales
        const yachts = await ComentCardYacht.findAll();
        const yachtMap = {};

        yachts.forEach(y => {
            yachtMap[y.yachtId] = y;
        });

        const createdRecords = [];

        for (const cruise of cruises) {

            const yacht = yachtMap[cruise.yacht_id];
            if (!yacht) continue;

            // 4️⃣ Evitar duplicados
            const exists = await ComentCardQR.findOne({
                where: {
                    comentCardYachtId: yacht.id
                }
            });

            if (exists) continue;

            // 5️⃣ Crear registro
            const created = await ComentCardQR.create({
                comentCardYachtId: yacht.id,
                code: cruise.code,
                name: cruise.name,
                startDate: cruise.start_date,
                endDate: cruise.end_date
            });

            const encodedId = Utils.encode(created.id);
            const accessLink = `${process.env.URL_CAPTAINS}/coment_card/${encodedId}`;

            await created.update({ accessLink });

            createdRecords.push({
                ...created.toJSON(),
                accessLink
            });
        }

        console.log(`Se crearon ${createdRecords.length} registros`);
    } catch (error) {
        console.error('Error ejecutando cron job:', error);
    }
}

const CronJobs = {
    generateWeeklyCruises,
}

module.exports = CronJobs 