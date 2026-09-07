const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Yacht = require('../../../src/models/catalogs/yacht.models');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRuleMaterial = require('../../../src/models/catalogs/maintenanceRuleMaterial.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('../../../src/models/catalogs/maintenanceRecordMaterial.models');
const Product = require('../../../src/models/operations/inventory/product.models');

beforeAll(async () => {
    await bootTestApp();
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - models & associations', () => {
    it('wires equipment -> rule -> record through their aliases', async () => {
        const { yacht } = await createCompanyWithYacht('Maintenance Models Co', 'Maintenance Models Yacht');
        const product = await Product.create({ name: 'Aceite 15W40', type: 'CONSUMABLE' });

        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Babor' });
        const rule = await MaintenanceRule.create({
            name: 'Cambio de aceite',
            periodicityValue: 250,
            periodicityUnit: 'horas',
        });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });
        await MaintenanceRuleMaterial.create({ ruleId: rule.id, productId: product.id, recommendedQuantity: 20 });

        const record = await MaintenanceRecord.create({
            equipmentId: equipment.id,
            yachtId: yacht.id,
            ruleId: rule.id,
            responsible: 'Juan Pérez',
            workPerformed: 'Cambio de aceite y filtro',
            performedAt: new Date('2026-09-01T14:00:00.000Z'),
        });
        await MaintenanceRecordMaterial.create({ recordId: record.id, productId: product.id, quantity: 20 });

        const reloaded = await YachtEquipment.findOne({
            where: { id: equipment.id },
            include: [
                { model: Yacht, as: 'yacht' },
                {
                    model: MaintenanceRuleAssignment,
                    as: 'ruleAssignments',
                    include: [{
                        model: MaintenanceRule,
                        as: 'rule',
                        include: [{
                            model: MaintenanceRuleMaterial,
                            as: 'recommendedMaterials',
                            include: [{ model: Product, as: 'product' }],
                        }],
                    }],
                },
                {
                    model: MaintenanceRecord,
                    as: 'records',
                    include: [
                        { model: MaintenanceRule, as: 'rule' },
                        {
                            model: MaintenanceRecordMaterial,
                            as: 'materials',
                            include: [{ model: Product, as: 'product' }],
                        },
                    ],
                },
            ],
        });

        expect(reloaded.yacht.id).toBe(yacht.id);
        expect(reloaded.ruleAssignments).toHaveLength(1);
        expect(reloaded.ruleAssignments[0].rule.name).toBe('Cambio de aceite');
        expect(reloaded.ruleAssignments[0].rule.recommendedMaterials[0].product.name).toBe('Aceite 15W40');
        expect(reloaded.records).toHaveLength(1);
        expect(reloaded.records[0].rule.name).toBe('Cambio de aceite');
        expect(reloaded.records[0].responsible).toBe('Juan Pérez');
        expect(reloaded.records[0].materials[0].product.name).toBe('Aceite 15W40');
    });
});
