const request = require('supertest');
const dayjs = require('dayjs');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

const getAlert = async (yachtId, equipmentId, ruleId) => {
    const response = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yachtId)}`));
    return response.body.find((alert) => alert.equipmentId === Utils.encode(equipmentId) && alert.ruleId === Utils.encode(ruleId));
};

const setup = async (name, ruleData, assignmentData = {}) => {
    const { yacht } = await createCompanyWithYacht(`${name} Co`, `${name} Yacht`);
    const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: `${name} Motor` });
    const rule = await MaintenanceRule.create({ name: `${name} regla`, ...ruleData });
    const assignment = await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id, ...assignmentData });
    const addRecord = (hoursReading, daysAgo, ruleId = rule.id) => MaintenanceRecord.create({
        equipmentId: equipment.id, yachtId: yacht.id, ruleId,
        responsible: 'Juan', workPerformed: 'Servicio', hoursReading,
        performedAt: dayjs().subtract(daysAgo, 'day').toDate(),
    });
    return { yacht, equipment, rule, assignment, addRecord };
};

describe('catalogs/maintenance - intervals', () => {
    it('validates the secondary calendar interval of a rule', async () => {
        const ok = await auth(request(app).post('/api/maintenance/rules')).send({
            name: 'Aceite dual', periodicityValue: 250, periodicityUnit: 'horas', secondaryValue: 6, secondaryUnit: 'meses',
        });
        expect(ok.status).toBe(200);
        expect((await MaintenanceRule.findOne({ where: { name: 'Aceite dual' } })).secondaryUnit).toBe('meses');

        const onCalendarRule = await auth(request(app).post('/api/maintenance/rules')).send({
            name: 'Revisión dual', periodicityValue: 30, periodicityUnit: 'dias', secondaryValue: 6, secondaryUnit: 'meses',
        });
        expect(onCalendarRule.status).toBe(400);

        const badUnit = await auth(request(app).post('/api/maintenance/rules')).send({
            name: 'Aceite dual 2', periodicityValue: 250, periodicityUnit: 'horas', secondaryValue: 6, secondaryUnit: 'horas',
        });
        expect(badUnit.status).toBe(400);
    });

    it('uses whichever interval comes first: hours or calendar', async () => {
        const { yacht, equipment, rule, addRecord } = await setup('Dual', {
            periodicityValue: 250, periodicityUnit: 'horas', secondaryValue: 6, secondaryUnit: 'meses',
        });
        // Pocas horas de uso pero más de 6 meses desde el servicio: manda el calendario.
        await addRecord(1000, 200);
        await addRecord(1050, 1, null);

        const alert = await getAlert(yacht.id, equipment.id, rule.id);
        expect(alert.status).toBe('vencida');
        expect(alert.remainingHours).toBeNull();
        expect(alert.remainingDays).toBeLessThan(0);
        expect(alert.periodDays).toBeGreaterThan(170);
    });

    it('lets an equipment use its own interval instead of the rule one', async () => {
        const { yacht, equipment, rule, assignment, addRecord } = await setup('Override', { periodicityValue: 250, periodicityUnit: 'horas' });
        await addRecord(1000, 10);
        await addRecord(1095, 1, null);

        expect((await getAlert(yacht.id, equipment.id, rule.id)).status).toBe('al_dia');

        const updated = await auth(request(app).put(`/api/maintenance/rule-assignments/${Utils.encode(assignment.id)}`)).send({ intervalOverride: 100 });
        expect(updated.status).toBe(200);
        const invalid = await auth(request(app).put(`/api/maintenance/rule-assignments/${Utils.encode(assignment.id)}`)).send({ intervalOverride: -5 });
        expect(invalid.status).toBe(400);

        const alert = await getAlert(yacht.id, equipment.id, rule.id);
        expect(alert.status).toBe('proxima');
        expect(alert.remainingHours).toBe(5);
        expect(alert.periodicityValue).toBe(100);
        expect(alert.intervalOverridden).toBe(true);

        const book = await auth(request(app).get(`/api/maintenance/yachts/${Utils.encode(yacht.id)}/book`));
        expect(book.body.equipment[0].rules[0]).toMatchObject({ periodicityValue: 100, intervalOverridden: true, assignmentId: Utils.encode(assignment.id) });
    });

    it('estimates when an hour-based rule falls due from the equipment usage', async () => {
        const { yacht, equipment, rule, addRecord } = await setup('Usage', { periodicityValue: 250, periodicityUnit: 'horas' });
        await addRecord(1000, 20);
        await auth(request(app).post(`/api/maintenance/equipment/${Utils.encode(equipment.id)}/hours`)).send({ reading: 1100 });

        // 100 h en 20 días = 5 h/día; quedan 150 h -> unos 30 días.
        const alert = await getAlert(yacht.id, equipment.id, rule.id);
        expect(alert.hoursPerDay).toBe(5);
        expect(Math.round(dayjs(alert.estimatedDueAt).diff(dayjs(), 'day', true))).toBe(30);
    });

    it('postpones the current due date with a reason until the next record of the rule', async () => {
        const { yacht, equipment, rule, assignment, addRecord } = await setup('Postpone', { periodicityValue: 250, periodicityUnit: 'horas' });
        await addRecord(1000, 20);
        await addRecord(1260, 1, null);
        expect((await getAlert(yacht.id, equipment.id, rule.id)).status).toBe('vencida');

        const postponeUrl = `/api/maintenance/rule-assignments/${Utils.encode(assignment.id)}/postpone`;
        expect((await auth(request(app).post(postponeUrl)).send({ untilHours: 1300 })).status).toBe(400);
        expect((await auth(request(app).post(postponeUrl)).send({ reason: 'Sin repuesto en puerto' })).status).toBe(400);
        expect((await auth(request(app).post(postponeUrl)).send({ reason: 'x', untilDate: dayjs().subtract(1, 'day').toISOString() })).status).toBe(400);

        const postponed = await auth(request(app).post(postponeUrl)).send({ reason: 'Sin repuesto en puerto', untilHours: 1300 });
        expect(postponed.status).toBe(200);

        const alert = await getAlert(yacht.id, equipment.id, rule.id);
        expect(alert.status).toBe('al_dia');
        expect(alert.remainingHours).toBe(40);
        expect(alert.postponed).toMatchObject({ untilHours: 1300, reason: 'Sin repuesto en puerto', by: 'Test Admin' });
        expect(alert.assignmentId).toBe(Utils.encode(assignment.id));

        // Cargar el siguiente servicio de la regla consume la posposición.
        await addRecord(1280, 0);
        const after = await getAlert(yacht.id, equipment.id, rule.id);
        expect(after.postponed).toBeNull();
        expect(after.remainingHours).toBe(250);
    });
});
