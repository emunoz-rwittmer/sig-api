const ComentCardYacht = require('../models/operations/comentCard/cardYacht.models');
const ComentCardQR = require('../models/operations/comentCard/cardQR.models');
const ShipmentDates = require('../models/operations/surveys/shipmentDates.models');
const StaffCompany = require('../models/catalogs/staffCompany.models');
const Staff = require('../models/catalogs/staff.models');
const Company = require('../models/catalogs/company.models');
const Positions = require('../models/catalogs/positions.models');
const Yacht = require('../models/catalogs/yacht.models');
const Form = require('../models/operations/surveys/form.models');
const { Op, fn, col, where } = require("sequelize");
const axios = require('axios');
const Utils = require('../utils/Utils');
const moment = require('moment');
const FormRespond = require('../models/operations/surveys/formRespond.models');

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

        const response = await axios.get(`http://localhost:3156/microservice/cruise?start=${startFormatted}&end=${endFormatted}`);
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
                    comentCardYachtId: yacht.id
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

const generateWeeklyEvaluationCaptains = async () => {
    try {

        const { start } = getWeekRange();
        const startFormatted = formatDateLocal(start);
        const now = moment();
        const periodWeek = `${now.isoWeekYear()}-W${String(now.isoWeek()).padStart(2, "0")}`;
        const expirationDate = now.add(3, 'days').toDate();

        const embarkedStaff = await ShipmentDates.findAll({
            where: {
                shipmentDate: { [Op.lte]: startFormatted },
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
                            attributes: ['id', 'firstName', 'lastName'],
                            include: [
                                {
                                    model: Positions,
                                    as: "staff_position",
                                    attributes: ['id', 'name'],
                                },
                            ]
                        },
                        {
                            model: Company,
                            as: "company",
                            attributes: ['id', 'name'],
                        },
                    ]
                },
            ]
        });

        // 🔥 1️⃣ Separar capitanes activos
        const captainByCompany = {};

        for (const shipment of embarkedStaff) {
            const companyId = shipment.empresa.companyId;
            const staff = shipment.empresa.staff;
            const positionCode = staff.staff_position?.name;

            if (positionCode === "Capitan") {
                captainByCompany[companyId] = staff;
            }
        }

        // 🔥 2️⃣ Generar evaluaciones solo para tripulación
        for (const shipment of embarkedStaff) {
            
            const companyId = shipment.empresa.companyId;
            const staff = shipment.empresa.staff;
            const positionCode = staff.staff_position?.name;

            // Saltar si es capitán
            if (positionCode === "Capitan") continue;

            const captain = captainByCompany[companyId];
            if (!captain) continue; // No hay capitán embarcado

            const positionId = Utils.encode(staff.staff_position.id);

            console.log('positionId',positionId)

            const forms = await Form.findAll({
                where: where(
                    fn("JSON_CONTAINS", col("positions"), JSON.stringify(positionId)),
                    Op.eq,
                    1
                )
            });

             console.log('forms',forms)

            for (const form of forms) {

                const exists = await FormRespond.findOne({
                    where: {
                        companyId,
                        formId: form.id,
                        evaluator: captain.firstName + ' ' + captain.lastName,
                        evaluated: staff.firstName + ' ' + staff.lastName,
                        periodWeek
                    }
                });

                if (!exists) {
                    await FormRespond.create({
                        companyId,
                        formId: form.id,
                        evaluator: captain.firstName + ' ' + captain.lastName,
                        evaluated: staff.firstName + ' ' + staff.lastName,
                        state: "Pendiente",
                        expirationDate,
                        periodWeek
                    });
                }
            }
        }

        console.log("Evaluaciones generadas correctamente");

    } catch (error) {
        console.error('Error ejecutando cron job:', error);
    }
};

const CronJobs = {
    generateWeeklyCruises,
    generateWeeklyEvaluationCaptains
}

module.exports = CronJobs 