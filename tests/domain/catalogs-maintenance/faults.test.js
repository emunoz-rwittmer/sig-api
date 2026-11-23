const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceFault = require('../../../src/models/catalogs/maintenanceFault.models');
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

const reportFault = (equipmentId, body = {}) => auth(request(app).post('/api/maintenance/faults')).send({
    equipmentId: Utils.encode(equipmentId),
    description: 'Fuga de aceite en el cárter',
    severity: 'alta',
    ...body,
});

describe('catalogs/maintenance - faults', () => {
    it('reports a fault signed by the logged-in user, lists it as open and edits it', async () => {
        const { yacht } = await createCompanyWithYacht('Faults Co', 'Faults Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Babor' });

        const created = await reportFault(equipment.id);
        expect(created.status).toBe(200);

        const list = await auth(request(app).get(`/api/maintenance/faults?yachtId=${Utils.encode(yacht.id)}&status=abierta`));
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0]).toMatchObject({
            equipmentId: Utils.encode(equipment.id),
            status: 'abierta',
            severity: 'alta',
            reportedBy: 'Test Admin',
            equipment: { id: Utils.encode(equipment.id), name: 'Motor Babor' },
        });

        const edited = await auth(request(app).put(`/api/maintenance/faults/${list.body[0].id}`))
            .send({ description: 'Fuga de aceite en el cárter y retenes', severity: 'critica' });
        expect(edited.status).toBe(200);
        const stored = await MaintenanceFault.findOne({ where: { equipmentId: equipment.id } });
        expect(stored.severity).toBe('critica');
    });

    it('rejects an invalid severity, a missing description and an unknown equipment', async () => {
        const { yacht } = await createCompanyWithYacht('Faults Bad Co', 'Faults Bad Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Generador' });

        expect((await reportFault(equipment.id, { severity: 'urgente' })).status).toBe(400);
        expect((await reportFault(equipment.id, { description: '  ' })).status).toBe(400);
        expect((await reportFault(999999999)).status).toBe(404);
        expect((await auth(request(app).get('/api/maintenance/faults?status=pendiente'))).status).toBe(400);
    });

    it('closes the fault with the record that attends it, and only once', async () => {
        const { yacht } = await createCompanyWithYacht('Faults Close Co', 'Faults Close Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Estribor' });
        const otherEquipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Bomba de achique' });
        await reportFault(equipment.id);
        const fault = await MaintenanceFault.findOne({ where: { equipmentId: equipment.id } });

        const recordBody = (overrides = {}) => ({
            equipmentId: Utils.encode(equipment.id),
            responsible: 'Mecánico',
            workPerformed: 'Cambio de retenes del cárter',
            performedAt: '2026-10-10T10:00:00.000Z',
            faultId: Utils.encode(fault.id),
            cause: 'Retén cristalizado por temperatura',
            ...overrides,
        });

        const wrongEquipment = await auth(request(app).post('/api/maintenance/records'))
            .send(recordBody({ equipmentId: Utils.encode(otherEquipment.id) }));
        expect(wrongEquipment.status).toBe(400);

        const attended = await auth(request(app).post('/api/maintenance/records')).send(recordBody());
        expect(attended.status).toBe(200);

        await fault.reload();
        const record = await MaintenanceRecord.findOne({ where: { workPerformed: 'Cambio de retenes del cárter' } });
        expect(fault.status).toBe('cerrada');
        expect(fault.recordId).toBe(record.id);
        expect(fault.cause).toBe('Retén cristalizado por temperatura');
        expect(record.maintenanceType).toBe('correctivo');

        const again = await auth(request(app).post('/api/maintenance/records')).send(recordBody({ workPerformed: 'Otra vez' }));
        expect(again.status).toBe(409);
        const editClosed = await auth(request(app).put(`/api/maintenance/faults/${Utils.encode(fault.id)}`))
            .send({ description: 'x', severity: 'baja' });
        expect(editClosed.status).toBe(409);

        const history = await auth(request(app).get(`/api/maintenance/records/${Utils.encode(record.id)}`));
        expect(history.body.fault).toMatchObject({ id: Utils.encode(fault.id), severity: 'alta' });
    });
});
