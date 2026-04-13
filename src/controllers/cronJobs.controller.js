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

const { sendEmailEvaluationCrew, sendEmailCommentCard } = require('../mails/mailer');


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

    try {
        const { start, end } = getWeekRange();
        const startFormatted = formatDateLocal(start);
        const endFormatted = formatDateLocal(end);

        const response = await axios.get(`${process.env.URL_MICRO_SERVICE}/microservice/cruise?start=${startFormatted}&end=${endFormatted}`);
        const cruises = response.data;

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

        //sendEmailCommentCard();

        console.log(`Se crearon ${createdRecords.length} registros`);
    } catch (error) {
        console.error('Error ejecutando cron job:', error);
    }
}

const generateWeeklyEvaluationCrew = async () => {
    try {

        const { start } = getWeekRange();
        const startFormatted = formatDateLocal(start);

        const now = moment();
        const periodWeek = `${now.isoWeekYear()}-W${String(now.isoWeek()).padStart(2, "0")}`;
        const expirationDate = now.add(3, "days").toDate();

        // 🔹 Obtener tripulación embarcada
        const embarkedStaff = await ShipmentDates.findAll({
            where: {
                shipmentDate: { [Op.lt]: startFormatted },
                [Op.or]: [
                    { dischargeDate: null },
                    { dischargeDate: { [Op.gte]: startFormatted } }
                ]
            },
            include: [
                {
                    model: StaffCompany,
                    as: "empresa",
                    include: [
                        {
                            model: Staff,
                            as: "staff",
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

        // 🔹 1️⃣ Separar capitanes por compañía
        const captainByCompany = {};
        const crewList = [];

        for (const shipment of embarkedStaff) {

            if (!shipment.empresa) {
                console.warn("Shipment sin empresa:", shipment.id);
                continue;
            }

            const companyId = shipment.empresa.companyId;
            const staff = shipment.empresa.staff;
            const positionName = staff.staff_position?.name;

            if (!staff || !staff.staff_position) continue;

            const fullName = `${staff.firstName} ${staff.lastName}`;

            if (positionName === "Capitan") {
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

        // 🔹 2️⃣ Obtener todos los forms
        const forms = await Form.findAll({ where: { active: true } });

        // 🔹 Agrupar forms por position
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
                console.warn("positions mal formateado en form:", form.id);
                positions = [];
            }

            for (const pos of positions) {

                if (!formsByPosition[pos]) {
                    formsByPosition[pos] = [];
                }

                formsByPosition[pos].push(form);
            }
        }

        // 🔹 3️⃣ Obtener evaluaciones ya creadas
        const existingEvaluations = await FormRespond.findAll({
            where: { periodWeek }
        });

        const existingSet = new Set();

        for (const ev of existingEvaluations) {
            const key = `${ev.companyId}_${ev.formId}_${ev.evaluator}_${ev.evaluated}`;
            existingSet.add(key);
        }

        const newEvaluations = [];

        // 🔹 4️⃣ Capitán → Tripulación
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

        // 🔹 5️⃣ Tripulación → Capitán (solo forms NO administrativos)
        for (const crew of crewList) {

            const captain = captainByCompany[crew.companyId];
            if (!captain) continue;

            const positionEncoded = Utils.encode(captain.staff_position.id);
            const captainForms = formsByPosition[positionEncoded] || [];

            for (const form of captainForms) {

                // 🔥 ignorar evaluaciones administrativas
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

        // 🔹 6️⃣ Insertar evaluaciones nuevas en bulk
        if (newEvaluations.length > 0) {
            await FormRespond.bulkCreate(newEvaluations);
        }

        console.log("======================================");
        console.log("CRON WEEKLY CREW EVALUATION");
        console.log("Evaluaciones creadas:", newEvaluations.length);
        console.log("Periodo:", periodWeek);
        console.log("======================================");

        sendEmailEvaluationCrew();

    } catch (error) {
        console.error("Error ejecutando cron job:", error);
    }
};

const CronJobs = {
    generateWeeklyCruises,
    generateWeeklyEvaluationCrew
}

module.exports = CronJobs 