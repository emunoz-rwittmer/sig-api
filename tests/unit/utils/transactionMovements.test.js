const {
    MAX_PAGE_SIZE,
    buildProductSummary,
    buildWarehouseSummary,
    classifyMovement,
    countByMovement,
    parseDateParam,
    parseMovements,
    parsePagination,
} = require('../../../src/utils/transactionMovements');

describe('classifyMovement', () => {
    it('distingue ingreso, transferencia, salida, consumo de bar y ajuste', () => {
        expect(classifyMovement({ type: 'IN', warehouseToId: 2 })).toBe('ENTRY');
        expect(classifyMovement({ type: 'OUT', warehouseFromId: 1, warehouseToId: 2 })).toBe('TRANSFER');
        expect(classifyMovement({ type: 'OUT', warehouseFromId: 1 })).toBe('EXIT');
        expect(classifyMovement({ type: 'BAR_CONSUMPTION', warehouseFromId: 1 })).toBe('BAR_CONSUMPTION');
        expect(classifyMovement({ type: 'ADJUST', warehouseToId: 3 })).toBe('ADJUST');
    });
});

describe('parseMovements', () => {
    it('acepta lista separada por coma o arreglo, sin duplicados ni mayúsculas', () => {
        expect(parseMovements('entry, TRANSFER,entry')).toEqual(['ENTRY', 'TRANSFER']);
        expect(parseMovements(['EXIT'])).toEqual(['EXIT']);
        expect(parseMovements('')).toEqual([]);
        expect(parseMovements(undefined)).toEqual([]);
    });

    it('devuelve null ante un movimiento desconocido', () => {
        expect(parseMovements('ENTRY,FOO')).toBeNull();
    });
});

describe('parseDateParam', () => {
    it('distingue vacío (null) de inválido (undefined)', () => {
        expect(parseDateParam('')).toBeNull();
        expect(parseDateParam('no-es-fecha')).toBeUndefined();
        expect(parseDateParam('2026-11-01T05:00:00.000Z')).toEqual(new Date('2026-11-01T05:00:00.000Z'));
    });
});

describe('parsePagination', () => {
    it('usa valores por defecto y limita el tamaño de página', () => {
        expect(parsePagination({})).toEqual({ page: 1, pageSize: 25 });
        expect(parsePagination({ page: '3', pageSize: '10' })).toEqual({ page: 3, pageSize: 10 });
        expect(parsePagination({ page: '-1', pageSize: '5000' })).toEqual({ page: 1, pageSize: MAX_PAGE_SIZE });
    });
});

describe('agregaciones del Excel', () => {
    const rows = [
        { productId: 1, product: { name: 'Agua', sku: 'A1', unit: 'u' }, movement: 'ENTRY', quantity: 10, warehouseTo: { id: 1, name: 'Quito' } },
        { productId: 1, product: { name: 'Agua', sku: 'A1', unit: 'u' }, movement: 'TRANSFER', quantity: '4.5', warehouseFrom: { id: 1, name: 'Quito' }, warehouseTo: { id: 2, name: 'Yate' } },
        { productId: 2, product: { name: 'Ron', sku: 'R1', unit: 'ml' }, movement: 'BAR_CONSUMPTION', quantity: 60, warehouseFrom: { id: 2, name: 'Yate' } },
    ];

    it('suma cantidades por producto y tipo de movimiento', () => {
        const [agua, ron] = buildProductSummary(rows);
        expect(agua).toMatchObject({ name: 'Agua', movements: 2 });
        expect(agua.quantities).toMatchObject({ ENTRY: 10, TRANSFER: 4.5, EXIT: 0 });
        expect(ron.quantities.BAR_CONSUMPTION).toBe(60);
    });

    it('cuenta entradas y salidas por bodega', () => {
        expect(buildWarehouseSummary(rows)).toEqual([
            { name: 'Quito', location: '', incoming: 1, outgoing: 1, total: 2 },
            { name: 'Yate', location: '', incoming: 1, outgoing: 1, total: 2 },
        ]);
    });

    it('cuenta transacciones por movimiento', () => {
        expect(countByMovement(rows)).toEqual({ ENTRY: 1, TRANSFER: 1, EXIT: 0, BAR_CONSUMPTION: 1, ADJUST: 0 });
    });
});
