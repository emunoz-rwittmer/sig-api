// Script de diagnóstico de solo lectura para generateWeeklyEvaluationCrew.
// No escribe nada en la BD. Ejecutar con: node diagnose-weekly-eval.js
// Borrar este archivo despues de usarlo.

require('dotenv').config();
const moment = require('moment');
const { Op } = require('sequelize');

const db = require('./src/utils/database');
require('./src/models/init.models')(); // registra todas las asociaciones (empresa, staff_position, etc.)
const Utils = require('./src/utils/Utils');
const ShipmentDates = require('./src/models/operations/surveys/shipmentDates.models');
const StaffCompany = require('./src/models/catalogs/staffCompany.models');
const Staff = require('./src/models/catalogs/staff.models');
const Company = require('./src/models/catalogs/company.models');
const Positions = require('./src/models/catalogs/positions.models');
const Form = require('./src/models/operations/surveys/form.models');
const FormRespond = require('./src/models/operations/surveys/formRespond.models');

(async () => {
    try {
        await db.authenticate();
        console.log('DB conectada OK\n');

        const now = moment();
        const evaluationWeekStart = now.clone().day(5).startOf('day');
        if (evaluationWeekStart.isAfter(now)) {
            evaluationWeekStart.subtract(7, 'days');
        }
        const endOfEvaluationWeek = evaluationWeekStart.clone().add(7, 'days');
        const evaluationRunAt = now.toDate();
        const startOfToday = now.clone().startOf('day');
        const startOfTomorrow = startOfToday.clone().add(1, 'day');

        console.log('=== FECHAS ===');
        console.log('now:', now.format());
        console.log('evaluationWeekStart:', evaluationWeekStart.format());
        console.log('endOfEvaluationWeek:', endOfEvaluationWeek.format());
        console.log();

        // ---- Paso 1: tripulantes embarcados segun el query actual del cron ----
        const embarkedStaff = await ShipmentDates.findAll({
            where: {
                shipmentDate: { [Op.lt]: endOfEvaluationWeek.toDate() },
                [Op.or]: [
                    { dischargeDate: null },
                    { dischargeDate: { [Op.gte]: evaluationRunAt } }
                ]
            },
            include: [
                {
                    model: StaffCompany,
                    as: 'empresa',
                    required: true,
                    include: [
                        {
                            model: Staff,
                            as: 'staff',
                            where: { active: true },
                            attributes: ['id', 'firstName', 'lastName'],
                            include: [{ model: Positions, as: 'staff_position', attributes: ['id', 'name'] }]
                        },
                        { model: Company, as: 'company', attributes: ['id', 'name'] }
                    ]
                }
            ]
        });
        console.log('Paso 1 - embarkedStaff (ShipmentDates que matchean el where):', embarkedStaff.length);

        // Cuantos de esos NO tienen empresa/staff (se descartan silenciosamente)
        let sinEmpresa = 0, sinStaffOPosition = 0;
        const positionNamesSeen = new Set();
        for (const s of embarkedStaff) {
            if (!s.empresa) { sinEmpresa++; continue; }
            const staff = s.empresa.staff;
            if (!staff || !staff.staff_position) { sinStaffOPosition++; continue; }
            positionNamesSeen.add(staff.staff_position.name);
        }
        console.log('  -> sin empresa (staffCompany):', sinEmpresa);
        console.log('  -> sin staff o sin staff_position:', sinStaffOPosition);
        console.log('  -> nombres de posicion encontrados:', [...positionNamesSeen]);
        console.log('  -> hay alguno llamado exactamente "Capitan"?', positionNamesSeen.has('Capitan'));
        console.log();

        // ---- Paso 2: forms activos y su campo positions ----
        const forms = await Form.findAll({ where: { active: true } });
        console.log('Paso 2 - forms activos:', forms.length);
        for (const f of forms) {
            console.log(`  form #${f.id} isAdministrative=${f.isAdministrative} positions=${JSON.stringify(f.positions)}`);
        }
        console.log();

        // ---- Paso 3: todas las posiciones y su encode actual ----
        const positions = await Positions.findAll({ raw: true });
        console.log('Paso 3 - catalogo de posiciones (id: nombre -> encode actual):');
        for (const p of positions) {
            console.log(`  ${p.id}: "${p.name}" -> ${Utils.encode(p.id)}`);
        }
        console.log();

        // ---- Paso 4: evaluaciones ya existentes hoy (para el dedup) ----
        const existingToday = await FormRespond.count({
            where: { createdAt: { [Op.gte]: startOfToday.toDate(), [Op.lt]: startOfTomorrow.toDate() } }
        });
        console.log('Paso 4 - FormRespond creados hoy (usado para dedup):', existingToday);

        process.exit(0);
    } catch (e) {
        console.error('ERROR EN DIAGNOSTICO:', e);
        process.exit(1);
    }
})();
