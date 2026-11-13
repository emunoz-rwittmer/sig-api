/**
 * Clasificación y agregación del historial de transacciones de inventario.
 *
 * La columna `type` no alcanza para describir el movimiento: una
 * transferencia entre bodegas se guarda como `OUT` con origen y destino, un
 * ingreso es `IN` solo con destino y un ajuste de stock a la baja es `OUT`
 * solo con origen. El "movimiento" se deriva de esas tres columnas.
 */

const MOVEMENTS = {
    ENTRY: { key: 'ENTRY', label: 'Ingreso' },
    TRANSFER: { key: 'TRANSFER', label: 'Transferencia' },
    EXIT: { key: 'EXIT', label: 'Salida / ajuste' },
    BAR_CONSUMPTION: { key: 'BAR_CONSUMPTION', label: 'Consumo bar' },
    ADJUST: { key: 'ADJUST', label: 'Ajuste' },
};

const MOVEMENT_KEYS = Object.keys(MOVEMENTS);

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const REPORT_TIME_ZONE = 'America/Guayaquil';

function classifyMovement({ type, warehouseFromId, warehouseToId } = {}) {
    if (type === 'BAR_CONSUMPTION') return 'BAR_CONSUMPTION';
    if (type === 'ADJUST') return 'ADJUST';
    if (warehouseFromId && warehouseToId) return 'TRANSFER';
    if (warehouseToId) return 'ENTRY';
    return 'EXIT';
}

function getMovementLabel(key) {
    return MOVEMENTS[key]?.label ?? 'Sin clasificar';
}

/** Acepta "ENTRY,TRANSFER" o ['ENTRY', 'TRANSFER']; devuelve null si alguna clave no existe. */
function parseMovements(value) {
    if (value === undefined || value === null || value === '') return [];

    const keys = (Array.isArray(value) ? value : String(value).split(','))
        .map((key) => String(key).trim().toUpperCase())
        .filter(Boolean);

    if (keys.some((key) => !MOVEMENT_KEYS.includes(key))) return null;
    return [...new Set(keys)];
}

/** Fecha ISO (o YYYY-MM-DD) a Date; null si viene vacía, undefined si es inválida. */
function parseDateParam(value) {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function parsePagination({ page, pageSize } = {}) {
    const parsedPage = Number.parseInt(page, 10);
    const parsedSize = Number.parseInt(pageSize, 10);

    return {
        page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
        pageSize: Number.isInteger(parsedSize) && parsedSize > 0
            ? Math.min(parsedSize, MAX_PAGE_SIZE)
            : DEFAULT_PAGE_SIZE,
    };
}

const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const round2 = (value) => Math.round(value * 100) / 100;

function getFullName(person) {
    return [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
}

/**
 * Totales por producto para la hoja "Por producto" del Excel. Las cantidades
 * solo se suman dentro de un mismo producto (misma unidad de medida).
 */
function buildProductSummary(rows = []) {
    const byProduct = new Map();

    rows.forEach((row) => {
        const key = row.productId ?? row.product?.name ?? 'sin-producto';
        if (!byProduct.has(key)) {
            byProduct.set(key, {
                name: row.product?.name ?? 'Sin producto',
                sku: row.product?.sku ?? '',
                unit: row.product?.unit ?? '',
                movements: 0,
                quantities: Object.fromEntries(MOVEMENT_KEYS.map((movement) => [movement, 0])),
            });
        }

        const entry = byProduct.get(key);
        const movement = row.movement ?? classifyMovement(row);
        entry.movements += 1;
        entry.quantities[movement] = round2(entry.quantities[movement] + toNumber(row.quantity));
    });

    return [...byProduct.values()].sort((a, b) => b.movements - a.movements || a.name.localeCompare(b.name));
}

/** Movimientos que entran y salen de cada bodega (conteo, no cantidades: mezclan unidades). */
function buildWarehouseSummary(rows = []) {
    const byWarehouse = new Map();

    const touch = (warehouse, field) => {
        if (!warehouse?.name) return;
        const key = warehouse.id ?? warehouse.name;
        if (!byWarehouse.has(key)) {
            byWarehouse.set(key, { name: warehouse.name, location: warehouse.location ?? '', incoming: 0, outgoing: 0 });
        }
        byWarehouse.get(key)[field] += 1;
    };

    rows.forEach((row) => {
        touch(row.warehouseTo, 'incoming');
        touch(row.warehouseFrom, 'outgoing');
    });

    return [...byWarehouse.values()]
        .map((warehouse) => ({ ...warehouse, total: warehouse.incoming + warehouse.outgoing }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function countByMovement(rows = []) {
    const counts = Object.fromEntries(MOVEMENT_KEYS.map((key) => [key, 0]));
    rows.forEach((row) => {
        const movement = row.movement ?? classifyMovement(row);
        counts[movement] += 1;
    });
    return counts;
}

const dateFormatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: REPORT_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: REPORT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

function formatReportDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}

function formatReportTime(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : timeFormatter.format(date);
}

module.exports = {
    MOVEMENTS,
    MOVEMENT_KEYS,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    classifyMovement,
    getMovementLabel,
    parseMovements,
    parseDateParam,
    parsePagination,
    getFullName,
    buildProductSummary,
    buildWarehouseSummary,
    countByMovement,
    formatReportDate,
    formatReportTime,
};
