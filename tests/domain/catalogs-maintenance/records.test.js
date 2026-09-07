const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const Product = require('../../../src/models/operations/inventory/product.models');
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

describe('catalogs/maintenance - records (historial)', () => {
    it('creates a corrective record without a rule, and it appears in the yacht history', async () => {
        const { yacht } = await createCompanyWithYacht('Records Co', 'Records Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Bomba de achique' });
        const product = await Product.create({ name: 'Manguera', type: 'DISCRETE' });

        const created = await auth(
            request(app).post('/api/maintenance/records').send({
                equipmentId: Utils.encode(equipment.id),
                responsible: 'Carlos Mecánico',
                workPerformed: 'Cambio de manguera de succión',
                performedAt: '2026-09-01T10:00:00.000Z',
                hoursReading: 1200,
                materials: [{ productId: Utils.encode(product.id), quantity: 2 }],
            })
        );
        expect(created.status).toBe(200);
        expect(created.body.data).toBe('resource created successfully');

        const stored = await MaintenanceRecord.findOne({ where: { responsible: 'Carlos Mecánico' } });
        expect(stored.ruleId).toBeNull();
        expect(stored.yachtId).toBe(yacht.id);

        const list = await auth(
            request(app).get(`/api/maintenance/records?yachtId=${Utils.encode(yacht.id)}`)
        );
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0].workPerformed).toBe('Cambio de manguera de succión');
        expect(list.body[0].materials[0].product.name).toBe('Manguera');
        expect(list.body[0].materials[0].quantity).toBe(2);
        expect(list.body[0].rule).toBeNull();
    });

    it('creates a record tied to a rule', async () => {
        const { yacht } = await createCompanyWithYacht('Records Rule Co', 'Records Rule Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });
        const rule = await MaintenanceRule.create({ name: 'Cambio de aceite' });

        const created = await auth(
            request(app).post('/api/maintenance/records').send({
                equipmentId: Utils.encode(equipment.id),
                ruleId: Utils.encode(rule.id),
                responsible: 'Pedro',
                workPerformed: 'Cambio de aceite',
                performedAt: '2026-09-02T08:00:00.000Z',
            })
        );
        expect(created.status).toBe(200);

        const stored = await MaintenanceRecord.findOne({ where: { responsible: 'Pedro' } });
        expect(stored.ruleId).toBe(rule.id);
    });

    it('filters the history correctly across multiple yachts', async () => {
        const { yacht: yachtA } = await createCompanyWithYacht('Records Filter Co A', 'Records Filter Yacht A');
        const { yacht: yachtB } = await createCompanyWithYacht('Records Filter Co B', 'Records Filter Yacht B');
        const equipmentA = await YachtEquipment.create({ yachtId: yachtA.id, name: 'Motor A' });
        const equipmentB = await YachtEquipment.create({ yachtId: yachtB.id, name: 'Motor B' });
        await MaintenanceRecord.create({
            equipmentId: equipmentA.id, yachtId: yachtA.id,
            responsible: 'Responsable A', workPerformed: 'Trabajo A',
            performedAt: new Date('2026-09-01T00:00:00.000Z'),
        });
        await MaintenanceRecord.create({
            equipmentId: equipmentB.id, yachtId: yachtB.id,
            responsible: 'Responsable B', workPerformed: 'Trabajo B',
            performedAt: new Date('2026-09-01T00:00:00.000Z'),
        });

        const response = await auth(
            request(app).get(`/api/maintenance/records?yachtId=${Utils.encode(yachtA.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.every((item) => item.yachtId === Utils.encode(yachtA.id))).toBe(true);
        expect(response.body.some((item) => item.workPerformed === 'Trabajo A')).toBe(true);
        expect(response.body.some((item) => item.workPerformed === 'Trabajo B')).toBe(false);
    });

    it('rejects creation without equipmentId, responsible, workPerformed or a valid performedAt', async () => {
        const { yacht } = await createCompanyWithYacht('Records Invalid Co', 'Records Invalid Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });

        const response = await auth(
            request(app).post('/api/maintenance/records').send({
                equipmentId: Utils.encode(equipment.id),
                responsible: 'Pedro',
                workPerformed: 'Algo',
                performedAt: 'not-a-date',
            })
        );
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('allows editing a record while not approved, and blocks it once approved', async () => {
        const { yacht } = await createCompanyWithYacht('Records Edit Co', 'Records Edit Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });
        const record = await MaintenanceRecord.create({
            equipmentId: equipment.id,
            yachtId: yacht.id,
            responsible: 'Original',
            workPerformed: 'Trabajo original',
            performedAt: new Date('2026-09-01T00:00:00.000Z'),
        });

        const updated = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}`).send({
                equipmentId: Utils.encode(equipment.id),
                responsible: 'Corregido',
                workPerformed: 'Trabajo corregido',
                performedAt: '2026-09-01T00:00:00.000Z',
            })
        );
        expect(updated.status).toBe(200);
        expect(updated.body.data).toBe('resource updated successfully');
        expect((await MaintenanceRecord.findByPk(record.id)).responsible).toBe('Corregido');

        const approved = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`).send({
                approvedBy: 'Jefe de Mantenimiento',
            })
        );
        expect(approved.status).toBe(200);
        expect(approved.body.data).toBe('resource approved successfully');

        const blocked = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}`).send({
                equipmentId: Utils.encode(equipment.id),
                responsible: 'No debería pasar',
                workPerformed: 'No debería pasar',
                performedAt: '2026-09-01T00:00:00.000Z',
            })
        );
        expect(blocked.status).toBe(409);

        const reapproved = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`).send({
                approvedBy: 'Otro',
            })
        );
        expect(reapproved.status).toBe(409);
    });

    it('rejects approval without approvedBy', async () => {
        const { yacht } = await createCompanyWithYacht('Records Approve Co', 'Records Approve Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });
        const record = await MaintenanceRecord.create({
            equipmentId: equipment.id,
            yachtId: yacht.id,
            responsible: 'X',
            workPerformed: 'Y',
            performedAt: new Date('2026-09-01T00:00:00.000Z'),
        });

        const response = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`).send({})
        );
        expect(response.status).toBe(400);
    });
});
