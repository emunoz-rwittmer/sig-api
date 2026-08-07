// Dry-run de generateWeeklyEvaluationCrew (src/controllers/cronJobs.controller.js).
// Reproduce exactamente la misma logica de seleccion pero NUNCA escribe en la BD
// (no llama a FormRespond.bulkCreate). Sirve para verificar, antes o despues de que
// corra el cron real, cuantas evaluaciones se generarian y por que.
//
// Uso: npm run diagnose:weekly-eval

const moment = require("moment");
const { Op } = require("sequelize");

const db = require("../utils/database");
const initModels = require("../models/init.models");
initModels();

const Utils = require("../utils/Utils");
const ShipmentDates = require("../models/operations/surveys/shipmentDates.models");
const StaffCompany = require("../models/catalogs/staffCompany.models");
const Staff = require("../models/catalogs/staff.models");
const Company = require("../models/catalogs/company.models");
const Positions = require("../models/catalogs/positions.models");
const Form = require("../models/operations/surveys/form.models");
const FormRespond = require("../models/operations/surveys/formRespond.models");

const run = async () => {
    await db.authenticate();

    const now = moment();
    const evaluationWeekStart = now.clone().day(5).startOf("day");
    if (evaluationWeekStart.isAfter(now)) {
        evaluationWeekStart.subtract(7, "days");
    }
    const periodWeek = `${evaluationWeekStart.format("YYYY-MM-DD")}_${evaluationWeekStart.clone().add(7, "days").format("YYYY-MM-DD")}`;
    const evaluationRunAt = now.toDate();
    const startOfToday = now.clone().startOf("day");
    const startOfTomorrow = startOfToday.clone().add(1, "day");

    console.log("=== FECHAS ===");
    console.log("now:", now.format());
    console.log("evaluationWeekStart (viernes de la semana a evaluar):", evaluationWeekStart.format());
    console.log("periodWeek:", periodWeek);
    console.log();

    // Paso 1: quien esta embarcado AHORA MISMO (now cae dentro de [shipmentDate, dischargeDate]).
    const embarkedStaff = await ShipmentDates.findAll({
        where: {
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
                        include: [{ model: Positions, as: "staff_position", attributes: ["id", "name"] }]
                    },
                    { model: Company, as: "company", attributes: ["id", "name"] }
                ]
            }
        ]
    });
    console.log("Paso 1 - tripulantes embarcados ahora:", embarkedStaff.length);

    const captainByCompany = {};
    const crewList = [];
    for (const shipment of embarkedStaff) {
        if (!shipment.empresa) continue;
        const companyId = shipment.empresa.companyId;
        const staff = shipment.empresa.staff;
        if (!staff || !staff.staff_position) continue;
        const positionName = staff.staff_position.name;
        const fullName = `${staff.firstName} ${staff.lastName}`;
        if (positionName === "Capitán") {
            captainByCompany[companyId] = { ...staff.toJSON(), fullName };
        } else {
            crewList.push({ companyId, ...staff.toJSON(), fullName });
        }
    }
    console.log("  -> capitanes detectados en compañias:", Object.keys(captainByCompany));
    console.log("  -> tripulantes (no capitanes):", crewList.length);
    console.log();

    // Paso 2: forms activos y su mapeo por posicion codificada.
    const forms = await Form.findAll({ where: { active: true } });
    const formsByPosition = {};
    for (const form of forms) {
        let positions = [];
        try {
            if (typeof form.positions === "string") {
                positions = form.positions.startsWith("[") ? JSON.parse(form.positions) : [form.positions];
            } else if (Array.isArray(form.positions)) {
                positions = form.positions;
            }
        } catch (error) {
            positions = [];
        }
        for (const pos of positions) {
            if (!formsByPosition[pos]) formsByPosition[pos] = [];
            formsByPosition[pos].push(form);
        }
    }
    console.log("Paso 2 - forms activos:", forms.length);
    console.log();

    // Paso 3: dedup contra lo ya creado hoy (misma logica que el cron real).
    const existingEvaluations = await FormRespond.findAll({
        where: { createdAt: { [Op.gte]: startOfToday.toDate(), [Op.lt]: startOfTomorrow.toDate() } }
    });
    const existingSet = new Set();
    for (const ev of existingEvaluations) {
        existingSet.add(`${ev.companyId}_${ev.formId}_${ev.evaluator}_${ev.evaluated}`);
    }
    console.log("Paso 3 - FormRespond ya creados hoy:", existingEvaluations.length);
    console.log();

    // Paso 4: simular la creacion (sin bulkCreate real).
    const newEvaluations = [];

    for (const crew of crewList) {
        const captain = captainByCompany[crew.companyId];
        if (!captain) continue;
        const positionEncoded = Utils.encode(crew.staff_position.id);
        const crewForms = formsByPosition[positionEncoded] || [];
        for (const form of crewForms) {
            const key = `${crew.companyId}_${form.id}_${captain.fullName}_${crew.fullName}`;
            if (existingSet.has(key)) continue;
            newEvaluations.push({ companyId: crew.companyId, formId: form.id, evaluator: captain.fullName, evaluated: crew.fullName, periodWeek });
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
            const key = `${crew.companyId}_${form.id}_${crew.fullName}_${captain.fullName}`;
            if (existingSet.has(key)) continue;
            newEvaluations.push({ companyId: crew.companyId, formId: form.id, evaluator: crew.fullName, evaluated: captain.fullName, periodWeek });
            existingSet.add(key);
        }
    }

    const porCompania = {};
    for (const ev of newEvaluations) {
        porCompania[ev.companyId] = (porCompania[ev.companyId] || 0) + 1;
    }

    console.log("=== RESUMEN ===");
    console.log("Evaluaciones que se crearian (dry-run, no se escribio nada):", newEvaluations.length);
    console.log("Por compañia:", porCompania);
    console.log("Periodo:", periodWeek);
};

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error en diagnostico:", error);
        process.exit(1);
    });
