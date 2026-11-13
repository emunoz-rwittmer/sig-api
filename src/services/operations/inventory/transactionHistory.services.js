const { Op } = require('sequelize');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Product = require('../../../models/operations/inventory/product.models');
const Register = require('../../../models/operations/inventory/register.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const Staff = require('../../../models/catalogs/staff.models');
const { MOVEMENT_KEYS, classifyMovement, getFullName } = require('../../../utils/transactionMovements');

// Debe coincidir con `classifyMovement`: misma regla expresada como filtro SQL.
const STOCK_TYPES = { [Op.in]: ['IN', 'OUT'] };
const MOVEMENT_WHERE = {
    ENTRY: { type: STOCK_TYPES, warehouseFromId: null, warehouseToId: { [Op.ne]: null } },
    TRANSFER: { type: STOCK_TYPES, warehouseFromId: { [Op.ne]: null }, warehouseToId: { [Op.ne]: null } },
    EXIT: { type: STOCK_TYPES, warehouseToId: null },
    BAR_CONSUMPTION: { type: 'BAR_CONSUMPTION' },
    ADJUST: { type: 'ADJUST' },
};

// Tope del Excel: por encima de esto el archivo deja de ser útil y la
// consulta se vuelve costosa; se pide acotar los filtros.
const MAX_EXPORT_ROWS = 50000;

const WAREHOUSE_ATTRIBUTES = ['id', 'name', 'location', 'type'];

const INCLUDES = [
    { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'unit'] },
    { model: Warehouse, as: 'warehouseFrom', attributes: WAREHOUSE_ATTRIBUTES },
    { model: Warehouse, as: 'warehouseTo', attributes: WAREHOUSE_ATTRIBUTES },
    { model: Staff, as: 'responsible', attributes: ['id', 'firstName', 'lastName'] },
    { model: Register, as: 'registro', attributes: ['id', 'counter'] },
];

function buildWhere(filters = {}) {
    const conditions = [];

    if (filters.from || filters.to) {
        conditions.push({
            createdAt: {
                ...(filters.from && { [Op.gte]: filters.from }),
                ...(filters.to && { [Op.lte]: filters.to }),
            },
        });
    }

    if (filters.movements?.length) {
        conditions.push({ [Op.or]: filters.movements.map((key) => MOVEMENT_WHERE[key]) });
    }

    if (filters.warehouseId) {
        conditions.push({
            [Op.or]: [{ warehouseFromId: filters.warehouseId }, { warehouseToId: filters.warehouseId }],
        });
    }

    if (filters.warehouseFromId) conditions.push({ warehouseFromId: filters.warehouseFromId });
    if (filters.warehouseToId) conditions.push({ warehouseToId: filters.warehouseToId });
    if (filters.userId) conditions.push({ userId: filters.userId });
    if (filters.productId) conditions.push({ productId: filters.productId });

    const search = filters.search?.trim();
    if (search) {
        const like = { [Op.like]: `%${search}%` };
        conditions.push({
            [Op.or]: [
                { '$product.name$': like },
                { '$product.sku$': like },
                { '$registro.counter$': like },
                { referenceId: like },
            ],
        });
    }

    return conditions.length ? { [Op.and]: conditions } : {};
}

function serializeWarehouse(warehouse) {
    if (!warehouse) return null;
    return { id: warehouse.id, name: warehouse.name, location: warehouse.location, type: warehouse.type };
}

function serializeTransaction(transaction) {
    const plain = transaction.get({ plain: true });
    return {
        id: plain.id,
        createdAt: plain.createdAt,
        type: plain.type,
        movement: classifyMovement(plain),
        quantity: Number(plain.quantity) || 0,
        productId: plain.productId,
        product: plain.product
            ? { id: plain.product.id, name: plain.product.name, sku: plain.product.sku, unit: plain.product.unit }
            : null,
        warehouseFrom: serializeWarehouse(plain.warehouseFrom),
        warehouseTo: serializeWarehouse(plain.warehouseTo),
        responsible: plain.responsible
            ? { id: plain.responsible.id, fullName: getFullName(plain.responsible) }
            : null,
        register: plain.registro ? { id: plain.registro.id, counter: plain.registro.counter } : null,
        referenceId: plain.referenceId,
    };
}

const orderBy = (sortOrder) => [['createdAt', sortOrder === 'asc' ? 'ASC' : 'DESC'], ['id', sortOrder === 'asc' ? 'ASC' : 'DESC']];

async function countWith(where, extra = {}) {
    return Transaction.count({ where, include: INCLUDES, distinct: true, col: 'id', ...extra });
}

class TransactionHistoryService {

    static async list(filters, { page, pageSize }) {
        const where = buildWhere(filters);

        const [rows, total] = await Promise.all([
            Transaction.findAll({
                where,
                include: INCLUDES,
                order: orderBy(filters.sortOrder),
                limit: pageSize,
                offset: (page - 1) * pageSize,
                subQuery: false,
            }),
            countWith(where),
        ]);

        return {
            rows: rows.map(serializeTransaction),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    }

    /**
     * Totales del conjunto filtrado completo (no solo de la página visible).
     * `byMovement` ignora el filtro de movimientos a propósito: alimenta las
     * pestañas por tipo, que deben seguir mostrando cuántas hay de cada uno.
     */
    static async summary(filters) {
        const where = buildWhere(filters);
        const whereWithoutMovements = buildWhere({ ...filters, movements: [] });

        const movementCounts = await Promise.all(
            MOVEMENT_KEYS.map((key) => countWith({ [Op.and]: [whereWithoutMovements, MOVEMENT_WHERE[key]] })),
        );

        const [products, responsibles] = await Promise.all([
            // `col` va como nombre físico: Sequelize no traduce el atributo en COUNT(DISTINCT ...).
            countWith(where, { col: 'product_id' }),
            countWith(where, { col: 'user_id' }),
        ]);

        const byMovement = Object.fromEntries(MOVEMENT_KEYS.map((key, index) => [key, movementCounts[index]]));

        return {
            total: movementCounts.reduce((sum, count) => sum + count, 0),
            byMovement,
            products,
            responsibles,
        };
    }

    /** Todas las filas filtradas, para el Excel. Devuelve null si superan el tope. */
    static async listForExport(filters) {
        const where = buildWhere(filters);
        const total = await countWith(where);
        if (total > MAX_EXPORT_ROWS) return null;

        const rows = await Transaction.findAll({
            where,
            include: INCLUDES,
            order: orderBy(filters.sortOrder),
            subQuery: false,
        });

        return rows.map(serializeTransaction);
    }

    /** Opciones de los filtros: solo bodegas, personas y productos que tienen movimientos. */
    static async filterOptions() {
        const [warehouses, responsibles, products] = await Promise.all([
            Warehouse.findAll({ attributes: WAREHOUSE_ATTRIBUTES, order: [['name', 'ASC']] }),
            Staff.findAll({
                attributes: ['id', 'firstName', 'lastName'],
                include: [{ model: Transaction, as: 'transactions', attributes: [], required: true }],
                group: ['staff.id'],
                order: [['firstName', 'ASC'], ['lastName', 'ASC']],
            }),
            Product.findAll({
                attributes: ['id', 'name', 'sku'],
                include: [{ model: Transaction, as: 'transactions', attributes: [], required: true }],
                group: ['product.id'],
                order: [['name', 'ASC']],
            }),
        ]);

        return {
            warehouses: warehouses.map((warehouse) => serializeWarehouse(warehouse.get({ plain: true }))),
            responsibles: responsibles.map((staff) => ({ id: staff.id, fullName: getFullName(staff) })),
            products: products.map((product) => ({ id: product.id, name: product.name, sku: product.sku })),
        };
    }
}

TransactionHistoryService.MAX_EXPORT_ROWS = MAX_EXPORT_ROWS;
TransactionHistoryService.buildWhere = buildWhere;

module.exports = TransactionHistoryService;
