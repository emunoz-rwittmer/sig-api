const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht, createDepartment, createPosition } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('../../../src/models/catalogs/maintenanceRecordMaterial.models');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const Stock = require('../../../src/models/operations/inventory/stock.models');
const Transaction = require('../../../src/models/operations/inventory/transaction.models');
const Roles = require('../../../src/models/catalogs/roles.models');
const Staff = require('../../../src/models/catalogs/staff.models');
const Tokens = require('../../../src/utils/tokens');
const Utils = require('../../../src/utils/Utils');

let app;
let token;
let staffToken;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);
// Inventario solo registra movimientos de personal: aprueba un colaborador.
const asStaff = (httpRequest) => httpRequest.set('Authorization', `Bearer ${staffToken}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
    const role = await Roles.findOne({ where: { name: 'admin' } });
    const staff = await Staff.create({
        firstName: 'Jefe', lastName: 'Máquinas', email: 'jefe-maquinas@example.com', cellPhone: '0966666666',
        password: 'Sup3rSecret!', departamentId: (await createDepartment('Máquinas')).id, positionId: (await createPosition('Jefe de máquinas')).id,
        contractType: 'Fijo', active: true, roleId: role.id,
    });
    staffToken = Tokens.generateAccessToken({
        id: Utils.encode(staff.id), firstName: staff.firstName, lastName: staff.lastName, rol: 'admin', kind: 'staff', sessionId: 'test',
    });
});

afterAll(async () => {
    await shutdownTestApp();
});

// Yate con su bodega (y la del bar, que nunca se usa), un producto con stock y un registro que lo consumió.
const setup = async (name, { stock = 10, used = 3, warehouses = 1 } = {}) => {
    const { yacht } = await createCompanyWithYacht(`${name} Co`, `${name} Yacht`);
    const created = [];
    for (let index = 0; index < warehouses; index += 1) {
        created.push(await Warehouse.create({ name: `${name} bodega ${index + 1}`, location: 'Abordo', type: 'Yate', yachtId: yacht.id }));
    }
    await Warehouse.create({ name: `${name} bar`, location: 'Abordo', type: 'Bar', yachtId: yacht.id });
    const product = await Product.create({ name: `${name} aceite 15W40`, type: 'DISCRETE' });
    if (created[0]) await Stock.create({ productId: product.id, warehouseId: created[0].id, companyId: null, quantity: stock });
    const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });
    const record = await MaintenanceRecord.create({
        equipmentId: equipment.id, yachtId: yacht.id, responsible: 'Juan',
        workPerformed: `${name} cambio de aceite`, performedAt: new Date('2026-10-01T10:00:00.000Z'),
    });
    await MaintenanceRecordMaterial.create({ recordId: record.id, productId: product.id, quantity: used });
    const stockOf = async (warehouse = created[0]) => Number((await Stock.findOne({ where: { productId: product.id, warehouseId: warehouse.id } }))?.quantity ?? 0);
    const approve = (body = {}) => asStaff(request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`)).send(body);
    return { yacht, warehouses: created, product, record, stockOf, approve };
};

describe('catalogs/maintenance - inventory', () => {
    it('discounts the materials from the yacht warehouse on approval and returns them if the record is voided', async () => {
        const { record, product, warehouses, stockOf, approve } = await setup('Stock');

        expect((await approve()).status).toBe(200);
        expect(await stockOf()).toBe(7);
        expect((await record.reload()).stockWarehouseId).toBe(warehouses[0].id);
        const out = await Transaction.findOne({ where: { productId: product.id, type: 'OUT' } });
        expect(out).toMatchObject({ warehouseFromId: warehouses[0].id, reason: 'Consumo de mantenimiento' });

        const voided = await auth(request(app).post(`/api/maintenance/records/${Utils.encode(record.id)}/void`)).send({ reason: 'Error de carga' });
        expect(voided.status).toBe(200);
        expect(await stockOf()).toBe(10);
        expect(await Transaction.count({ where: { productId: product.id, type: 'IN', reason: 'Anulación de mantenimiento' } })).toBe(1);
    });

    it('asks a panel user to approve from a staff account when materials leave the inventory', async () => {
        const { record, stockOf } = await setup('Panel');
        const response = await auth(request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`)).send({});
        expect(response.status).toBe(409);
        expect(await stockOf()).toBe(10);
    });

    it('blocks the approval without enough stock and leaves everything as it was', async () => {
        const { record, stockOf, approve } = await setup('Short', { stock: 2, used: 3 });

        const response = await approve();
        expect(response.status).toBe(400);
        expect(JSON.stringify(response.body)).toMatch(/Stock insuficiente/);
        expect(await stockOf()).toBe(2);
        expect((await record.reload()).approvedAt).toBeNull();
    });

    it('asks which warehouse to use when the yacht has several, and blocks a yacht without one', async () => {
        const many = await setup('Many', { warehouses: 2 });
        expect((await many.approve()).status).toBe(409);
        expect((await many.approve({ warehouseId: Utils.encode(999999) })).status).toBe(400);
        expect((await many.approve({ warehouseId: Utils.encode(many.warehouses[0].id) })).status).toBe(200);
        expect(await many.stockOf()).toBe(7);

        const none = await setup('None', { warehouses: 0 });
        expect((await none.approve()).status).toBe(409);

        const book = await auth(request(app).get(`/api/maintenance/yachts/${Utils.encode(many.yacht.id)}/book`));
        expect(book.body.yacht.warehouses.map((warehouse) => warehouse.name)).toEqual(['Many bodega 1', 'Many bodega 2']);
    });
});
