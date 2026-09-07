const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRuleMaterial = require('../../../src/models/catalogs/maintenanceRuleMaterial.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('../../../src/models/catalogs/maintenanceRecordMaterial.models');
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

describe('catalogs/maintenance - book', () => {
    it('assembles yacht -> equipment -> rules (with recommended materials) -> history, without duplicating rows', async () => {
        const { yacht } = await createCompanyWithYacht('Book Co', 'Book Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Central' });
        const product = await Product.create({ name: 'Aceite 15W40', type: 'CONSUMABLE' });

        const ruleA = await MaintenanceRule.create({ name: 'Cambio de aceite', periodicityValue: 250, periodicityUnit: 'horas' });
        const ruleB = await MaintenanceRule.create({ name: 'Cambio de filtro', periodicityValue: 500, periodicityUnit: 'horas' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: ruleA.id });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: ruleB.id });
        await MaintenanceRuleMaterial.create({ ruleId: ruleA.id, productId: product.id, recommendedQuantity: 20 });

        const recordA = await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: ruleA.id,
            responsible: 'Juan', workPerformed: 'Cambio de aceite',
            performedAt: new Date('2026-08-01T00:00:00.000Z'),
        });
        await MaintenanceRecordMaterial.create({ recordId: recordA.id, productId: product.id, quantity: 4 });
        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: ruleB.id,
            responsible: 'Pedro', workPerformed: 'Cambio de filtro',
            performedAt: new Date('2026-08-15T00:00:00.000Z'),
        });

        const response = await auth(
            request(app).get(`/api/maintenance/yachts/${Utils.encode(yacht.id)}/book`)
        );

        expect(response.status).toBe(200);
        expect(response.body.yacht.name).toBe(yacht.name);
        expect(response.body.equipment).toHaveLength(1);

        const equipmentBook = response.body.equipment[0];
        expect(equipmentBook.name).toBe('Motor Central');
        expect(equipmentBook.rules).toHaveLength(2);
        const ruleAEntry = equipmentBook.rules.find((r) => r.name === 'Cambio de aceite');
        expect(ruleAEntry.periodicityValue).toBe(250);
        expect(ruleAEntry.recommendedMaterials).toHaveLength(1);
        expect(ruleAEntry.recommendedMaterials[0].product.name).toBe('Aceite 15W40');
        expect(ruleAEntry.recommendedMaterials[0].productId).toBe(Utils.encode(product.id));
        const ruleBEntry = equipmentBook.rules.find((r) => r.name === 'Cambio de filtro');
        expect(ruleBEntry.recommendedMaterials).toHaveLength(0);

        expect(equipmentBook.history).toHaveLength(2);
        expect(equipmentBook.history[0].workPerformed).toBe('Cambio de filtro');
        expect(equipmentBook.history[1].workPerformed).toBe('Cambio de aceite');
        expect(equipmentBook.history[1].materials).toHaveLength(1);
        expect(equipmentBook.history[1].materials[0].productId).toBe(Utils.encode(product.id));
    });

    it('reports 404 for a missing yacht', async () => {
        const response = await auth(
            request(app).get(`/api/maintenance/yachts/${Utils.encode(999999999)}/book`)
        );
        expect(response.status).toBe(404);
    });
});
