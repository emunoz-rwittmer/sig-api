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

const findAlert = (alerts, equipmentId, ruleId) => alerts.find(
    (alert) => alert.equipmentId === Utils.encode(equipmentId) && alert.ruleId === Utils.encode(ruleId)
);

describe('catalogs/maintenance - alerts', () => {
    it('flags an hour-based rule as overdue once current hours pass the due threshold', async () => {
        const { yacht } = await createCompanyWithYacht('Alerts Co', 'Alerts Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Overdue' });
        const rule = await MaintenanceRule.create({ name: 'Cambio de aceite', periodicityValue: 250, periodicityUnit: 'horas' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });

        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: rule.id,
            responsible: 'Juan', workPerformed: 'Cambio de aceite', hoursReading: 1000,
            performedAt: dayjs().subtract(10, 'day').toDate(),
        });
        // Current known hours come from the latest record overall, even if it belongs to another rule.
        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: null,
            responsible: 'Pedro', workPerformed: 'Chequeo rutinario', hoursReading: 1260,
            performedAt: dayjs().subtract(1, 'day').toDate(),
        });

        const response = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yacht.id)}`));
        expect(response.status).toBe(200);

        const alert = findAlert(response.body, equipment.id, rule.id);
        expect(alert.status).toBe('vencida');
        expect(alert.remainingHours).toBe(-10);
        expect(alert.currentHours).toBe(1260);
    });

    it('flags an hour-based rule as próxima within the 24h warning window, and al_dia otherwise', async () => {
        const { yacht } = await createCompanyWithYacht('Alerts Co 2', 'Alerts Yacht 2');
        const dueSoonEquipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Due Soon' });
        const okEquipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor OK' });
        const rule = await MaintenanceRule.create({ name: 'Cambio de filtro', periodicityValue: 250, periodicityUnit: 'horas' });
        await MaintenanceRuleAssignment.create({ equipmentId: dueSoonEquipment.id, ruleId: rule.id });
        await MaintenanceRuleAssignment.create({ equipmentId: okEquipment.id, ruleId: rule.id });

        await MaintenanceRecord.create({
            equipmentId: dueSoonEquipment.id, yachtId: yacht.id, ruleId: rule.id,
            responsible: 'Juan', workPerformed: 'Cambio de filtro', hoursReading: 1000,
            performedAt: dayjs().subtract(5, 'day').toDate(),
        });
        // due at 1250h, warning window is a flat 24h -> 1235 leaves 15h remaining
        await MaintenanceRecord.create({
            equipmentId: dueSoonEquipment.id, yachtId: yacht.id, ruleId: null,
            responsible: 'Pedro', workPerformed: 'Chequeo', hoursReading: 1235,
            performedAt: dayjs().subtract(1, 'day').toDate(),
        });

        await MaintenanceRecord.create({
            equipmentId: okEquipment.id, yachtId: yacht.id, ruleId: rule.id,
            responsible: 'Juan', workPerformed: 'Cambio de filtro', hoursReading: 1000,
            performedAt: dayjs().subtract(5, 'day').toDate(),
        });
        await MaintenanceRecord.create({
            equipmentId: okEquipment.id, yachtId: yacht.id, ruleId: null,
            responsible: 'Pedro', workPerformed: 'Chequeo', hoursReading: 1100,
            performedAt: dayjs().subtract(1, 'day').toDate(),
        });

        const response = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yacht.id)}`));
        expect(response.status).toBe(200);

        expect(findAlert(response.body, dueSoonEquipment.id, rule.id).status).toBe('proxima');
        expect(findAlert(response.body, okEquipment.id, rule.id).status).toBe('al_dia');
    });

    it('flags a date-based rule as vencida once the periodicity window has elapsed', async () => {
        const { yacht } = await createCompanyWithYacht('Alerts Co 3', 'Alerts Yacht 3');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Balsa Salvavidas' });
        const rule = await MaintenanceRule.create({ name: 'Inspección anual', periodicityValue: 30, periodicityUnit: 'dias' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });

        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: rule.id,
            responsible: 'Juan', workPerformed: 'Inspección', performedAt: dayjs().subtract(40, 'day').toDate(),
        });

        const response = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yacht.id)}`));
        const alert = findAlert(response.body, equipment.id, rule.id);
        expect(alert.status).toBe('vencida');
        expect(alert.remainingDays).toBeLessThanOrEqual(0);
    });

    it('flags an assigned rule with no history as nunca_realizada', async () => {
        const { yacht } = await createCompanyWithYacht('Alerts Co 4', 'Alerts Yacht 4');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Generador Nuevo' });
        const rule = await MaintenanceRule.create({ name: 'Primera revisión', periodicityValue: 100, periodicityUnit: 'horas' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });

        const response = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yacht.id)}`));
        const alert = findAlert(response.body, equipment.id, rule.id);
        expect(alert.status).toBe('nunca_realizada');
        expect(alert.lastPerformedAt).toBeNull();
    });

    it('excludes inactive assignments, inactive rules and inactive equipment', async () => {
        const { yacht } = await createCompanyWithYacht('Alerts Co 5', 'Alerts Yacht 5');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Equipo Inactivo', active: false });
        const activeEquipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Equipo Activo' });
        const rule = await MaintenanceRule.create({ name: 'Regla X', periodicityValue: 10, periodicityUnit: 'dias' });
        const inactiveRule = await MaintenanceRule.create({ name: 'Regla Inactiva', periodicityValue: 10, periodicityUnit: 'dias', active: false });

        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });
        await MaintenanceRuleAssignment.create({ equipmentId: activeEquipment.id, ruleId: inactiveRule.id });
        await MaintenanceRuleAssignment.create({ equipmentId: activeEquipment.id, ruleId: rule.id, active: false });

        const response = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yacht.id)}`));
        expect(response.body).toHaveLength(0);
    });

    it('filters alerts by yachtId', async () => {
        const { yacht: yachtA } = await createCompanyWithYacht('Alerts Co 6A', 'Alerts Yacht 6A');
        const { yacht: yachtB } = await createCompanyWithYacht('Alerts Co 6B', 'Alerts Yacht 6B');
        const equipmentA = await YachtEquipment.create({ yachtId: yachtA.id, name: 'Equipo A' });
        const equipmentB = await YachtEquipment.create({ yachtId: yachtB.id, name: 'Equipo B' });
        const rule = await MaintenanceRule.create({ name: 'Regla Compartida', periodicityValue: 10, periodicityUnit: 'dias' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipmentA.id, ruleId: rule.id });
        await MaintenanceRuleAssignment.create({ equipmentId: equipmentB.id, ruleId: rule.id });

        const response = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yachtA.id)}`));
        expect(response.body).toHaveLength(1);
        expect(response.body[0].equipmentId).toBe(Utils.encode(equipmentA.id));
    });
});
