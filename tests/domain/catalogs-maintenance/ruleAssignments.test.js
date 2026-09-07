const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
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

describe('catalogs/maintenance - rule assignments', () => {
    it('assigns a rule to an equipment and lists it under the equipment', async () => {
        const { yacht } = await createCompanyWithYacht('Assign Co', 'Assign Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Estribor' });
        const rule = await MaintenanceRule.create({ name: 'Cambio de aceite' });

        const created = await auth(
            request(app).post('/api/maintenance/rule-assignments').send({
                equipmentId: Utils.encode(equipment.id),
                ruleId: Utils.encode(rule.id),
            })
        );
        expect(created.status).toBe(200);
        expect(created.body.data).toBe('resource created successfully');

        const list = await auth(
            request(app).get(`/api/maintenance/equipment/${Utils.encode(equipment.id)}/rules`)
        );
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0].rule.name).toBe('Cambio de aceite');
        expect(list.body[0].active).toBe(true);
    });

    it('rejects a duplicate assignment', async () => {
        const { yacht } = await createCompanyWithYacht('Dup Co', 'Dup Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Generador' });
        const rule = await MaintenanceRule.create({ name: 'Revisión general' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });

        const response = await auth(
            request(app).post('/api/maintenance/rule-assignments').send({
                equipmentId: Utils.encode(equipment.id),
                ruleId: Utils.encode(rule.id),
            })
        );
        expect(response.status).toBe(409);
    });

    it('toggles an assignment active flag and 404s on a missing one', async () => {
        const { yacht } = await createCompanyWithYacht('Toggle Co', 'Toggle Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Winche' });
        const rule = await MaintenanceRule.create({ name: 'Engrase' });
        const assignment = await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });

        const updated = await auth(
            request(app)
                .put(`/api/maintenance/rule-assignments/${Utils.encode(assignment.id)}`)
                .send({ active: false })
        );
        expect(updated.status).toBe(200);
        const stored = await MaintenanceRuleAssignment.findByPk(assignment.id);
        expect(stored.active).toBe(false);

        const missing = await auth(
            request(app)
                .put(`/api/maintenance/rule-assignments/${Utils.encode(999999999)}`)
                .send({ active: false })
        );
        expect(missing.status).toBe(404);
    });
});
