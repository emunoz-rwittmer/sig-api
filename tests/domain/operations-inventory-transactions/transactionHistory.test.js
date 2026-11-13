const request = require('supertest');
const XLSX = require('xlsx');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const Transaction = require('../../../src/models/operations/inventory/transaction.models');
const Register = require('../../../src/models/operations/inventory/register.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;
let fixtures;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

const binaryParser = (res, callback) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
};

async function createStaff(lastName) {
    const dept = await createDepartment(`Dept-${lastName}`);
    const pos = await createPosition(`Pos-${lastName}`);
    return Staff.create({
        firstName: 'TEST',
        lastName,
        email: `history-${lastName.toLowerCase()}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: dept.id,
        positionId: pos.id,
        contractType: 'Fijo',
        active: true,
    });
}

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);

    const ana = await createStaff('Ana');
    const bruno = await createStaff('Bruno');
    const quito = await Warehouse.create({ name: 'Bodega Quito', location: 'Quito', type: 'Bodega' });
    const yate = await Warehouse.create({ name: 'Yate Letty', location: 'Galápagos', type: 'Yate' });
    const agua = await Product.create({ name: 'Agua mineral', sku: 'AGUA-01', type: 'DISCRETE', unit: 'unidad' });
    const ron = await Product.create({ name: 'Ron añejo', sku: 'RON-01', type: 'CONSUMABLE', unit: 'ml' });
    const { company } = await createCompanyWithYacht('History Co');
    const register = await Register.create({ counter: '000-777', products: 4, companyId: company.id, userId: ana.id });

    const at = (iso) => ({ createdAt: new Date(iso), updatedAt: new Date(iso) });
    const entry = await Transaction.create({ productId: agua.id, userId: ana.id, warehouseToId: quito.id, quantity: 10, type: 'IN', referenceId: 'ORDER_ITEM_1' });
    const transfer = await Transaction.create({ productId: agua.id, userId: ana.id, warehouseFromId: quito.id, warehouseToId: yate.id, quantity: 4, type: 'OUT', registerId: register.id });
    const exit = await Transaction.create({ productId: agua.id, userId: bruno.id, warehouseFromId: quito.id, quantity: 1, type: 'OUT' });
    const bar = await Transaction.create({ productId: ron.id, userId: bruno.id, warehouseFromId: yate.id, quantity: 60, type: 'BAR_CONSUMPTION', referenceId: 'BAR_CONSUMPTION_55' });

    // Fechas fijas para probar el rango (createdAt no se puede pasar en create con timestamps).
    await Transaction.update(at('2026-10-01T15:00:00.000Z'), { where: { id: entry.id }, silent: true });
    await Transaction.update(at('2026-10-05T15:00:00.000Z'), { where: { id: transfer.id }, silent: true });
    await Transaction.update(at('2026-10-10T15:00:00.000Z'), { where: { id: exit.id }, silent: true });
    await Transaction.update(at('2026-10-20T15:00:00.000Z'), { where: { id: bar.id }, silent: true });

    fixtures = { ana, bruno, quito, yate, agua, ron };
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('GET /api/transactions/history', () => {
    it('lista todo, más reciente primero, con movimiento derivado e IDs codificados', async () => {
        const response = await auth(request(app).get('/api/transactions/history'));

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(4);
        expect(response.body.rows.map((row) => row.movement)).toEqual(['BAR_CONSUMPTION', 'EXIT', 'TRANSFER', 'ENTRY']);

        const transfer = response.body.rows[2];
        expect(transfer.warehouseFrom).toMatchObject({ id: Utils.encode(fixtures.quito.id), name: 'Bodega Quito' });
        expect(transfer.warehouseTo).toMatchObject({ id: Utils.encode(fixtures.yate.id), name: 'Yate Letty' });
        expect(transfer.responsible).toEqual({ id: Utils.encode(fixtures.ana.id), fullName: 'TEST Ana' });
        expect(transfer.register.counter).toBe('000-777');
        expect(transfer.quantity).toBe(4);

        expect(response.body.summary).toEqual({
            total: 4,
            byMovement: { ENTRY: 1, TRANSFER: 1, EXIT: 1, BAR_CONSUMPTION: 1, ADJUST: 0 },
            products: 2,
            responsibles: 2,
        });
    });

    it('filtra por movimiento, bodega, responsable, producto y rango de fechas', async () => {
        const get = (query) => auth(request(app).get('/api/transactions/history').query(query));

        const byMovement = await get({ movements: 'TRANSFER,ENTRY' });
        expect(byMovement.body.total).toBe(2);
        // Los contadores por tipo ignoran el filtro de movimiento (alimentan las pestañas).
        expect(byMovement.body.summary.byMovement).toMatchObject({ EXIT: 1, BAR_CONSUMPTION: 1 });

        expect((await get({ warehouseId: Utils.encode(fixtures.yate.id) })).body.total).toBe(2);
        expect((await get({ warehouseFromId: Utils.encode(fixtures.quito.id) })).body.total).toBe(2);
        expect((await get({ warehouseToId: Utils.encode(fixtures.yate.id) })).body.total).toBe(1);
        expect((await get({ userId: Utils.encode(fixtures.bruno.id) })).body.total).toBe(2);
        expect((await get({ productId: Utils.encode(fixtures.ron.id) })).body.total).toBe(1);
        expect((await get({ from: '2026-10-04T00:00:00.000Z', to: '2026-10-11T00:00:00.000Z' })).body.total).toBe(2);
    });

    it('busca por producto, SKU, número de registro o referencia', async () => {
        const search = async (text) => (await auth(request(app).get('/api/transactions/history').query({ search: text }))).body.total;

        expect(await search('ron')).toBe(1);
        expect(await search('AGUA-01')).toBe(3);
        expect(await search('000-777')).toBe(1);
        expect(await search('BAR_CONSUMPTION_55')).toBe(1);
    });

    it('pagina sin perder el total y ordena ascendente si se pide', async () => {
        const response = await auth(request(app).get('/api/transactions/history').query({ page: 2, pageSize: 3, sortOrder: 'asc' }));

        expect(response.body).toMatchObject({ total: 4, page: 2, pageSize: 3, totalPages: 2 });
        expect(response.body.rows).toHaveLength(1);
        expect(response.body.rows[0].movement).toBe('BAR_CONSUMPTION');
    });

    it('devuelve 400 ante filtros inválidos', async () => {
        const get = (query) => auth(request(app).get('/api/transactions/history').query(query));

        expect((await get({ movements: 'FOO' })).status).toBe(400);
        expect((await get({ from: 'no-es-fecha' })).status).toBe(400);
        expect((await get({ from: '2026-10-10T00:00:00Z', to: '2026-10-01T00:00:00Z' })).status).toBe(400);
        expect((await get({ warehouseId: 'xx' })).status).toBe(400);
    });

    it('devuelve 403 sin JWT', async () => {
        expect((await request(app).get('/api/transactions/history')).status).toBe(403);
    });
});

describe('GET /api/transactions/history/filters', () => {
    it('devuelve bodegas, y solo responsables y productos con movimientos', async () => {
        const response = await auth(request(app).get('/api/transactions/history/filters'));

        expect(response.status).toBe(200);
        expect(response.body.warehouses.map((item) => item.name)).toEqual(expect.arrayContaining(['Bodega Quito', 'Yate Letty']));
        expect(response.body.responsibles).toEqual([
            { id: Utils.encode(fixtures.ana.id), fullName: 'TEST Ana' },
            { id: Utils.encode(fixtures.bruno.id), fullName: 'TEST Bruno' },
        ]);
        expect(response.body.products.map((item) => item.name)).toEqual(['Agua mineral', 'Ron añejo']);
    });
});

describe('GET /api/reports/transactions/history', () => {
    it('genera el Excel con hojas Resumen, Detalle y Por producto respetando los filtros', async () => {
        const response = await auth(
            request(app).get('/api/reports/transactions/history').query({ productId: Utils.encode(fixtures.agua.id) }),
        ).buffer(true).parse(binaryParser);

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toMatch(/transacciones_\d{8}\.xlsx/);

        const workbook = XLSX.read(response.body, { type: 'buffer' });
        expect(workbook.SheetNames).toEqual(['Resumen', 'Detalle', 'Por producto']);

        const detail = XLSX.utils.sheet_to_json(workbook.Sheets.Detalle, { range: 3 });
        expect(detail.filter((row) => row['N°'] !== undefined && typeof row['N°'] === 'number')).toHaveLength(3);
        expect(detail[0]).toMatchObject({ Movimiento: 'Salida / ajuste', Producto: 'Agua mineral', 'Bodega origen': 'Bodega Quito' });

        const resumen = XLSX.utils.sheet_to_json(workbook.Sheets.Resumen, { header: 1 });
        expect(resumen.find((row) => row[0] === 'Producto')?.[1]).toBe('Agua mineral · AGUA-01');

        const products = XLSX.utils.sheet_to_json(workbook.Sheets['Por producto'], { range: 3 });
        expect(products).toHaveLength(1);
        expect(products[0]).toMatchObject({ Producto: 'Agua mineral', Movimientos: 3, Ingreso: 10, Transferencia: 4, 'Salida / ajuste': 1 });
    });

    it('devuelve 400 ante un filtro inválido', async () => {
        const response = await auth(request(app).get('/api/reports/transactions/history').query({ movements: 'FOO' }));
        expect(response.status).toBe(400);
    });
});
