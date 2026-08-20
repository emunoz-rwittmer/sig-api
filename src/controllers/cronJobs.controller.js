const axios = require('axios');
const Utils = require('../utils/Utils');
const moment = require('moment');
require('dotenv').config();

const ComentCardYacht = require('../models/operations/comentCard/cardYacht.models');
const ComentCardQR = require('../models/operations/comentCard/cardQR.models');
const ShipmentDates = require('../models/operations/surveys/shipmentDates.models');
const StaffCompany = require('../models/catalogs/staffCompany.models');
const Staff = require('../models/catalogs/staff.models');
const Company = require('../models/catalogs/company.models');
const FormRespond = require('../models/operations/surveys/formRespond.models');
const Positions = require('../models/catalogs/positions.models');
const Form = require('../models/operations/surveys/form.models');
const { Op } = require("sequelize");
const db = require('../utils/database');

const { sendEmailEvaluationCrew, sendEmailCommentCard } = require('../mails/mailer');
const Cruise = require('../models/bar/cruises.models');
const Passenger = require('../models/bar/passenger.models');
const ConsumerCardCount = require('../models/bar/consumerCardCount.model');
const ConsumerCard = require('../models/bar/consumerCard.models');
const CortecyCard = require('../models/bar/cortecyCard.models');
const { isWeeklyEvaluationCrewEnabled } = require('../utils/weeklyEvaluationCrewControl');


function getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToFriday = (day === 5 ? 0 : (day + 2) % 7);

    const start = new Date(now);
    start.setDate(now.getDate() - diffToFriday);
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

const generateWeeklyCruises = async () => {
    const { start, end } = getWeekRange();
    const startFormatted = formatDateLocal(start);
    const endFormatted = formatDateLocal(end);

    const response = await axios.get(`${process.env.URL_MICRO_SERVICE}/microservice/cruise?start=${startFormatted}&end=${endFormatted}`);
    const cruises = response.data;
    return cruises
}

// helper para convertir DD/MM/YYYY -> YYYY-MM-DD
const parseDate = (dateStr) => {
    if (!dateStr) return null;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const generateWeeklyCommentCard = async (req, res) => {

    try {
        const cruises = await generateWeeklyCruises();

        if (!cruises.length) {
            console.log('No hay cruceros para la semana');
            return;
        }

        const yachts = await ComentCardYacht.findAll();
        const yachtMap = {};

        yachts.forEach(y => {
            yachtMap[y.yachtId] = y;
        });

        const createdRecords = [];

        for (const cruise of cruises) {

            const yacht = yachtMap[cruise.yacht_id];
            if (!yacht) continue;

            const exists = await ComentCardQR.findOne({
                where: {
                    comentCardYachtId: yacht.id,
                    code: cruise.code
                }
            });

            if (exists) continue;

            const created = await ComentCardQR.create({
                comentCardYachtId: yacht.id,
                code: cruise.code,
                name: cruise.name,
                startDate: cruise.start_date,
                endDate: cruise.end_date
            });

            const encodedId = Utils.encode(created.id);
            const accessLink = `${process.env.URL_STAFFS}/coment_card/${encodedId}`;

            await created.update({ accessLink });

            createdRecords.push({
                ...created.toJSON(),
                accessLink
            });
        }

        sendEmailCommentCard();

        console.log(`Se crearon ${createdRecords.length} registros`);
    } catch (error) {
        console.error('Error ejecutando cron job:', error);
    }
}

const generateWeeklyCruisesAndPassengerInfo = async (req, res) => {
    const t = await db.transaction();

    try {
        const cruises = await generateWeeklyCruises();

        if (!cruises.length) {
            console.log('No hay cruceros para la semana');
            return;
        }

        const decodedCruises = cruises.map(c => ({
            ...c,
            id: Utils.decode(c.id)
        }));

        // 1. Crear cruceros
        const dataCruises = decodedCruises.map(cruise => ({
            yachtId: cruise.yacht_id,
            code: cruise.code,
            name: cruise.name,
            itinerary: cruise.itinerary,
            transferDay: cruise.transfer_day,
            startDate: cruise.start_date,
            endDate: cruise.end_date
        }));

        const createdCruises = await Cruise.bulkCreate(dataCruises, {
            returning: true,
            transaction: t
        });

        // 2. Obtener pasajeros
        let passengersToInsert = [];

        for (let i = 0; i < decodedCruises.length; i++) {
            const cruise = decodedCruises[i];
            const createdCruise = createdCruises[i];

            const response = await axios.get(`${process.env.URL_MICRO_SERVICE}/microservice/cruise/${cruise.id}/passenger_info`);

            const passengers = response.data || [];
            const mappedPassengers = passengers.map(p => {
                let startDate = null;
                let endDate = null;

                if (p.dates_on_board && p.dates_on_board.includes('-')) {
                    const [start, end] = p.dates_on_board.split('-');

                    startDate = parseDate(start.trim());
                    endDate = parseDate(end.trim());
                }

                return {
                    cruiseId: createdCruise.id,
                    identificationNumber: p.passenger_passport,
                    name: p.passenger_name,
                    age: p.passenger_age,
                    agency: p.agency_name,
                    cabin: p.cabin_name,
                    type: p.cruise_type,
                    nationality: p.passenger_nationality,
                    country: p.passenger_country,
                    gender: p.passenger_gender,
                    cruiseStartDate: startDate,
                    cruiseEndDate: endDate
                };
            });

            passengersToInsert.push(...mappedPassengers);
        }

        // 3. Crear pasajeros
        const createdPassengers = await Passenger.bulkCreate(passengersToInsert, {
            returning: true,
            transaction: t
        });

        // 4. Obtener contadores por barco con LOCK 🔒
        const countersByYacht = {};

        for (const cruise of createdCruises) {
            const yachtId = cruise.yachtId;

            // evitar buscar varias veces el mismo yacht
            if (countersByYacht[yachtId]) continue;

            let consecutivo = await ConsumerCardCount.findOne({
                where: { yachtId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!consecutivo) {
                consecutivo = await ConsumerCardCount.create(
                    {
                        yachtId,
                        valor: 1
                    },
                    { transaction: t }
                );
            }

            countersByYacht[yachtId] = consecutivo;
        }

        // 5. Crear consumer cards
        const consumerCards = [];

        for (const passenger of createdPassengers) {

            // obtener crucero del pasajero
            const cruise = createdCruises.find(c => c.id === passenger.cruiseId);

            const yachtId = cruise.yachtId;

            const counter = countersByYacht[yachtId];

            const formattedCounter = `000-${counter.valor
                .toString()
                .padStart(3, '0')}`;

            counter.valor++;

            consumerCards.push({
                passenger_id: passenger.id,
                numberCard: formattedCounter
            });
        }

        await ConsumerCard.bulkCreate(consumerCards, {
            transaction: t
        });

        // 6. Crear cortecies cards
        const cortecies = [
            { type: 'cortecy' },
            { type: 'intake' }
        ];

        const cortecyCards = [];

        for (const cruise of createdCruises) {

            const yachtId = cruise.yachtId;

            const counter = countersByYacht[yachtId];

            for (const cortecy of cortecies) {

                const formattedCounter = `000-${counter.valor
                    .toString()
                    .padStart(3, '0')}`;

                counter.valor++;

                cortecyCards.push({
                    type: cortecy.type,
                    cruiseId: cruise.id,
                    numberCard: formattedCounter
                });
            }
        }

        await CortecyCard.bulkCreate(cortecyCards, {
            transaction: t
        });

        // 7. Actualizar todos los contadores
        for (const yachtId in countersByYacht) {
            await countersByYacht[yachtId].save({
                transaction: t
            });
        }

        await t.commit();
        console.log('Todo creado correctamente 🚀');
    } catch (error) {
        await t.rollback();
        console.error('Error ejecutando cron job:', error);
    }
};

const generateWeeklyEvaluationCrew = async () => {
    try {
        const now = moment();
        const evaluationWeekStart = now.clone().day(5).startOf('day');
        if (evaluationWeekStart.isAfter(now)) {
            evaluationWeekStart.subtract(7, 'days');
        }
        const periodWeek = `${evaluationWeekStart.format('YYYY-MM-DD')}_${evaluationWeekStart.clone().add(7, 'days').format('YYYY-MM-DD')}`;
        const expirationDate = now.clone().add(3, "days").toDate();
        const evaluationRunAt = now.toDate();
        const startOfToday = now.clone().startOf('day');
        const startOfTomorrow = startOfToday.clone().add(1, 'day');

        const embarkedStaff = await ShipmentDates.findAll({
            where: {
                // "now" debe caer dentro de [shipmentDate, dischargeDate]: solo cuenta
                // quien ya esta embarcado al momento de disparar la tarea. Quien todavia
                // no llega (shipmentDate futuro) se evalua la semana siguiente, ya embarcado.
                shipmentDate: { [Op.lte]: evaluationRunAt },
                [Op.or]: [
                    { dischargeDate: null },
                    { dischargeDate: { [Op.gte]: evaluationRunAt } }
                ]
            },
            include: [
                {
                    model: StaffCompany,
                    as: "empresa",
                    required: true,
                    include: [
                        {
                            model: Staff,
                            as: "staff",
                            where: { active: true },
                            attributes: ["id", "firstName", "lastName"],
                            include: [
                                {
                                    model: Positions,
                                    as: "staff_position",
                                    attributes: ["id", "name"]
                                }
                            ]
                        },
                        {
                            model: Company,
                            as: "company",
                            attributes: ["id", "name"]
                        }
                    ]
                }
            ]
        });

        const captainByCompany = {};
        const crewList = [];

        for (const shipment of embarkedStaff) {
            if (!shipment.empresa) {
                console.warn("Shipment sin empresa:", shipment.id);
                continue;
            }

            const companyId = shipment.empresa.companyId;
            const staff = shipment.empresa.staff;

            if (!staff || !staff.staff_position) continue;

            if (Number.isInteger(companyId) && companyId > 0 &&
                !isWeeklyEvaluationCrewEnabled({ companyId })) {
                continue;
            }

            const positionName = staff.staff_position.name;
            const fullName = `${staff.firstName} ${staff.lastName}`;

            if (positionName === "Capitán") {
                captainByCompany[companyId] = {
                    ...staff.toJSON(),
                    fullName
                };
            } else {
                crewList.push({
                    companyId,
                    ...staff.toJSON(),
                    fullName
                });
            }
        }

        const forms = await Form.findAll({ where: { active: true } });

        const formsByPosition = {};
        for (const form of forms) {
            let positions = [];
            try {
                if (typeof form.positions === "string") {
                    if (form.positions.startsWith("[")) {
                        positions = JSON.parse(form.positions);
                    } else {
                        positions = [form.positions];
                    }
                } else if (Array.isArray(form.positions)) {
                    positions = form.positions;
                }
            } catch (error) {
                console.warn("Positions mal formateado en form:", form.id);
                positions = [];
            }

            for (const pos of positions) {
                if (!formsByPosition[pos]) {
                    formsByPosition[pos] = [];
                }
                formsByPosition[pos].push(form);
            }
        }

        const existingEvaluations = await FormRespond.findAll({
            where: {
                createdAt: {
                    [Op.gte]: startOfToday.toDate(),
                    [Op.lt]: startOfTomorrow.toDate()
                }
            }
        });

        const existingSet = new Set();
        for (const ev of existingEvaluations) {
            const key = `${ev.companyId}_${ev.formId}_${ev.evaluator}_${ev.evaluated}`;
            existingSet.add(key);
        }

        const newEvaluations = [];

        for (const crew of crewList) {
            const captain = captainByCompany[crew.companyId];
            if (!captain) continue;

            const positionEncoded = Utils.encode(crew.staff_position.id);
            const crewForms = formsByPosition[positionEncoded] || [];

            for (const form of crewForms) {
                const evaluator = captain.fullName;
                const evaluated = crew.fullName;
                const key = `${crew.companyId}_${form.id}_${evaluator}_${evaluated}`;

                if (existingSet.has(key)) continue;

                newEvaluations.push({
                    companyId: crew.companyId,
                    formId: form.id,
                    evaluator,
                    evaluated,
                    state: "Pendiente",
                    expirationDate,
                    periodWeek
                });

                existingSet.add(key);
            }
        }

        for (const crew of crewList) {
            const captain = captainByCompany[crew.companyId];
            if (!captain) continue;

            const positionEncoded = Utils.encode(captain.staff_position.id);
            const captainForms = formsByPosition[positionEncoded] || [];

            for (const form of captainForms) {
                if (form.isAdministrative) continue;

                const evaluator = crew.fullName;
                const evaluated = captain.fullName;
                const key = `${crew.companyId}_${form.id}_${evaluator}_${evaluated}`;

                if (existingSet.has(key)) continue;

                newEvaluations.push({
                    companyId: crew.companyId,
                    formId: form.id,
                    evaluator,
                    evaluated,
                    state: "Pendiente",
                    expirationDate,
                    periodWeek
                });

                existingSet.add(key);
            }
        }

        if (newEvaluations.length > 0) {
            await FormRespond.bulkCreate(newEvaluations);
        }

        console.log("======================================");
        console.log("CRON WEEKLY CREW EVALUATION - EJECUTADO");
        console.log("Evaluaciones creadas:", newEvaluations.length);
        console.log("Periodo:", periodWeek);
        console.log("======================================");

        await sendEmailEvaluationCrew();

    } catch (error) {
        console.error("Error ejecutando cron job de evaluaciones:", error);
    }
};

const CronJobs = {
    generateWeeklyCommentCard,
    generateWeeklyCruisesAndPassengerInfo,
    generateWeeklyEvaluationCrew
}

module.exports = CronJobs;
