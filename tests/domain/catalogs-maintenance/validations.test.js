const request = require('supertest');
const dayjs = require('dayjs');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);
const postRecord = (body) => auth(request(app).post('/api/maintenance/records')).send(body);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

// Equipo con dos registros (100 h el 1-sep y 500 h el 1-oct) y una regla de cambio de aceite.
const setup = async (name) => {
    const { yacht } = await createCompanyWithYacht(`${name} Co`, `${name} Yacht`);
    const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Generador de Babor' });
    const rule = await MaintenanceRule.create({ name: `${name} cambio de aceite`, periodicityValue: 400, periodicityUnit: 'horas' });
    const base = { equipmentId: equipment.id, yachtId: yacht.id, ruleId: rule.id, responsible: 'Juan', workPerformed: 'Cambio de aceite' };
    await MaintenanceRecord.create({ ...base, performedAt: new Date('2026-09-01T12:00:00.000Z'), hoursReading: 100 });
    await MaintenanceRecord.create({ ...base, performedAt: new Date('2026-10-01T12:00:00.000Z'), hoursReading: 500 });
    const body = (overrides = {}) => ({
        equipmentId: Utils.encode(equipment.id),
        ruleId: Utils.encode(rule.id),
        responsible: 'Juan',
        workPerformed: 'Cambio de aceite',
        performedAt: '2026-09-15T12:00:00.000Z',
        hoursReading: 300,
        ...overrides,
    });
    return { yacht, equipment, rule, body };
};

describe('catalogs/maintenance - validations', () => {
    it('rejects a record dated in the future', async () => {
        const { body } = await setup('Future');
        const response = await postRecord(body({ performedAt: dayjs().add(2, 'day').toISOString(), hoursReading: null }));
        expect(response.status).toBe(400);
        expect(response.body.error.message).toMatch(/no futura/);
    });

    it('rejects an hour reading that does not fit between the earlier and later readings', async () => {
        const { body } = await setup('Hours');

        const tooLow = await postRecord(body({ hoursReading: 50 }));
        expect(tooLow.status).toBe(400);
        expect(tooLow.body.error.code).toBe('HOURS_OUT_OF_ORDER');
        expect(tooLow.body.error.message).toMatch(/ya marcaba 100 h/);

        const tooHigh = await postRecord(body({ hoursReading: 4400 }));
        expect(tooHigh.status).toBe(400);
        expect(tooHigh.body.error.message).toMatch(/marcaba 500 h/);

        expect((await postRecord(body({ hoursReading: 300 }))).status).toBe(200);
    });

    it('applies the same check to manual hour readings', async () => {
        const { equipment } = await setup('Reading');
        const post = (data) => auth(request(app).post(`/api/maintenance/equipment/${Utils.encode(equipment.id)}/hours`)).send(data);

        expect((await post({ reading: 200, readAt: '2026-10-10T12:00:00.000Z' })).status).toBe(400);
        expect((await post({ reading: 700, readAt: '2026-09-20T12:00:00.000Z' })).status).toBe(400);
        expect((await post({ reading: 650 })).status).toBe(200);
    });

    it('warns about the same rule on the same equipment a few days apart and saves when confirmed', async () => {
        const { body, equipment } = await setup('Duplicate');
        const nearDuplicate = body({ performedAt: '2026-10-02T12:00:00.000Z', hoursReading: 510 });

        const warned = await postRecord(nearDuplicate);
        expect(warned.status).toBe(409);
        expect(warned.body.error.code).toBe('DUPLICATE_RECORD');
        expect(warned.body.error.message).toMatch(/Ya hay un registro/);

        expect((await postRecord({ ...nearDuplicate, confirmDuplicate: true })).status).toBe(200);
        expect(await MaintenanceRecord.count({ where: { equipmentId: equipment.id } })).toBe(3);

        // Correctivos (sin regla) no se marcan como duplicados.
        expect((await postRecord(body({ ruleId: null, performedAt: '2026-10-02T15:00:00.000Z', hoursReading: 510 }))).status).toBe(200);
    });

    it('does not flag the record being edited as its own duplicate', async () => {
        const { body, equipment } = await setup('Edit');
        const record = await MaintenanceRecord.findOne({ where: { equipmentId: equipment.id, hoursReading: 500 } });
        const response = await auth(request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}`))
            .send(body({ performedAt: '2026-10-01T12:00:00.000Z', hoursReading: 505 }));
        expect(response.status).toBe(200);
    });

    it('warns when another equipment already has the serial number, ignoring placeholders', async () => {
        const { yacht } = await setup('Serial');
        const create = (data) => auth(request(app).post('/api/maintenance/equipment')).send({ yachtId: Utils.encode(yacht.id), ...data });

        expect((await create({ name: 'Máquina de Babor', serialNumber: '4DZXM159001' })).status).toBe(200);
        const warned = await create({ name: 'Máquina de Estribor', serialNumber: ' 4dzxm159001 ' });
        expect(warned.status).toBe(409);
        expect(warned.body.error.code).toBe('DUPLICATE_SERIAL');
        expect(warned.body.error.message).toMatch(/Máquina de Babor/);
        expect((await create({ name: 'Máquina de Estribor', serialNumber: '4DZXM159001', confirmDuplicate: true })).status).toBe(200);

        expect((await create({ name: 'Bomba 1', serialNumber: 'N/A' })).status).toBe(200);
        expect((await create({ name: 'Bomba 2', serialNumber: 'n/a' })).status).toBe(200);

        // Editar un equipo sin cambiar su serie (aunque esté repetida) no vuelve a avisar.
        const repeated = await YachtEquipment.findOne({ where: { name: 'Máquina de Estribor', yachtId: yacht.id } });
        const edit = await auth(request(app).put(`/api/maintenance/equipment/${Utils.encode(repeated.id)}`))
            .send({ yachtId: Utils.encode(yacht.id), name: 'Máquina Principal de Estribor', serialNumber: '4DZXM159001' });
        expect(edit.status).toBe(200);
    });
});
