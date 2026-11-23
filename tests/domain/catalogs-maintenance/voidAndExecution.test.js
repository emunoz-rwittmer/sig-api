const request = require('supertest');
const dayjs = require('dayjs');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const MaintenanceFault = require('../../../src/models/catalogs/maintenanceFault.models');
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

describe('catalogs/maintenance - void, execution and critical equipment', () => {
    it('stores who did the work, the provider and the cost, and validates them', async () => {
        const { yacht } = await createCompanyWithYacht('Exec Co', 'Exec Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Generador' });
        const body = (overrides = {}) => ({
            equipmentId: Utils.encode(equipment.id),
            responsible: 'Taller Marino S.A.',
            workPerformed: 'Rebobinado del alternador',
            performedAt: '2026-10-01T10:00:00.000Z',
            performedByType: 'taller',
            provider: '  Taller Marino S.A.  ',
            cost: 1250.5,
            ...overrides,
        });

        expect((await auth(request(app).post('/api/maintenance/records')).send(body({ performedByType: 'otro' }))).status).toBe(400);
        expect((await auth(request(app).post('/api/maintenance/records')).send(body({ cost: -1 }))).status).toBe(400);
        expect((await auth(request(app).post('/api/maintenance/records')).send(body())).status).toBe(200);

        const stored = await MaintenanceRecord.findOne({ where: { workPerformed: 'Rebobinado del alternador' } });
        const response = await auth(request(app).get(`/api/maintenance/records/${Utils.encode(stored.id)}`));
        expect(response.body).toMatchObject({ performedByType: 'taller', provider: 'Taller Marino S.A.', cost: 1250.5 });
    });

    it('voids a record with a reason: it stops counting, cannot be edited or approved, and reopens its fault', async () => {
        const { yacht } = await createCompanyWithYacht('Void Co', 'Void Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Babor' });
        const rule = await MaintenanceRule.create({ name: 'Aceite void', periodicityValue: 250, periodicityUnit: 'horas' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });
        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: rule.id, responsible: 'Juan',
            workPerformed: 'Aceite anterior', hoursReading: 1000, performedAt: dayjs().subtract(30, 'day').toDate(),
        });
        const fault = await MaintenanceFault.create({
            equipmentId: equipment.id, yachtId: yacht.id, description: 'Fuga', severity: 'alta', reportedAt: new Date(),
        });
        // Registro equivocado: dice que se hizo el aceite a las 1.240 h y además cierra la falla.
        await auth(request(app).post('/api/maintenance/records')).send({
            equipmentId: Utils.encode(equipment.id), ruleId: Utils.encode(rule.id), responsible: 'Juan',
            workPerformed: 'Aceite cargado por error', hoursReading: 1240, performedAt: dayjs().subtract(1, 'day').toISOString(),
            faultId: Utils.encode(fault.id),
        });
        const wrong = await MaintenanceRecord.findOne({ where: { workPerformed: 'Aceite cargado por error' } });
        expect((await fault.reload()).status).toBe('cerrada');

        const voidUrl = `/api/maintenance/records/${Utils.encode(wrong.id)}/void`;
        expect((await auth(request(app).post(voidUrl)).send({})).status).toBe(400);
        const voided = await auth(request(app).post(voidUrl)).send({ reason: 'Cargado en el equipo equivocado' });
        expect(voided.status).toBe(200);
        expect((await auth(request(app).post(voidUrl)).send({ reason: 'otra vez' })).status).toBe(409);

        await wrong.reload();
        expect(wrong.voidedBy).toBe('Test Admin');
        expect(wrong.voidReason).toBe('Cargado en el equipo equivocado');
        expect((await fault.reload())).toMatchObject({ status: 'abierta', recordId: null, closedAt: null });

        const approve = await auth(request(app).put(`/api/maintenance/records/${Utils.encode(wrong.id)}/approve`)).send({});
        expect(approve.status).toBe(409);
        const edit = await auth(request(app).put(`/api/maintenance/records/${Utils.encode(wrong.id)}`)).send({
            equipmentId: Utils.encode(equipment.id), responsible: 'x', workPerformed: 'x', performedAt: '2026-10-01T10:00:00.000Z',
        });
        expect(edit.status).toBe(409);

        // Las alertas vuelven a medir desde el registro válido anterior (1.000 h), sin las 1.240 h anuladas.
        const alerts = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yacht.id)}`));
        expect(alerts.body[0]).toMatchObject({ remainingHours: 250, currentHours: 1000 });

        // El historial lo sigue mostrando, marcado como anulado.
        const book = await auth(request(app).get(`/api/maintenance/yachts/${Utils.encode(yacht.id)}/book`));
        expect(book.body.equipment[0].history.find((record) => record.workPerformed === 'Aceite cargado por error').voidedAt).not.toBeNull();
        expect(book.body.equipment[0].currentHours).toBe(1000);
    });

    it('classifies equipment by system and criticality, and flags critical equipment in alerts', async () => {
        const { yacht } = await createCompanyWithYacht('Critical Co', 'Critical Yacht');
        const base = { yachtId: Utils.encode(yacht.id), name: 'Bomba contra incendios' };

        expect((await auth(request(app).post('/api/maintenance/equipment')).send({ ...base, category: 'cocina' })).status).toBe(400);
        expect((await auth(request(app).post('/api/maintenance/equipment')).send({ ...base, category: 'seguridad', critical: true })).status).toBe(200);

        const equipment = await YachtEquipment.findOne({ where: { name: 'Bomba contra incendios' } });
        expect(equipment).toMatchObject({ category: 'seguridad', critical: true });

        const rule = await MaintenanceRule.create({ name: 'Prueba de bomba', periodicityValue: 1, periodicityUnit: 'meses' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id, baselineDate: dayjs().subtract(2, 'month').toDate() });
        const alerts = await auth(request(app).get(`/api/maintenance/alerts?yachtId=${Utils.encode(yacht.id)}`));
        expect(alerts.body[0]).toMatchObject({ equipmentCritical: true, status: 'vencida' });
    });
});
