const TransactionHistoryService = require('../../../services/operations/inventory/transactionHistory.services');
const Utils = require('../../../utils/Utils');
const AppError = require('../../../errors/AppError');
const { parseDateParam, parseMovements, parsePagination } = require('../../../utils/transactionMovements');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const decodeOptionalId = (value, fieldName) => (value ? decodeId(value, fieldName) : null);

/**
 * Traduce el query string del historial a filtros del servicio. Lo comparten
 * el listado (`GET /transactions/history`) y el Excel
 * (`GET /reports/transactions/history`) para que ambos filtren igual.
 */
const parseHistoryFilters = (query = {}) => {
    const from = parseDateParam(query.from);
    const to = parseDateParam(query.to);
    if (from === undefined) throw new AppError('from inválido', 400);
    if (to === undefined) throw new AppError('to inválido', 400);
    if (from && to && from > to) throw new AppError('El rango de fechas es inválido', 400);

    const movements = parseMovements(query.movements);
    if (movements === null) throw new AppError('movements inválido', 400);

    return {
        from,
        to,
        movements,
        warehouseId: decodeOptionalId(query.warehouseId, 'warehouseId'),
        warehouseFromId: decodeOptionalId(query.warehouseFromId, 'warehouseFromId'),
        warehouseToId: decodeOptionalId(query.warehouseToId, 'warehouseToId'),
        userId: decodeOptionalId(query.userId, 'userId'),
        productId: decodeOptionalId(query.productId, 'productId'),
        search: typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '',
        sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
    };
};

const encodeRef = (entity) => (entity ? { ...entity, id: Utils.encode(entity.id) } : null);

const encodeTransaction = (row) => ({
    ...row,
    id: Utils.encode(row.id),
    productId: Utils.encode(row.productId),
    product: encodeRef(row.product),
    warehouseFrom: encodeRef(row.warehouseFrom),
    warehouseTo: encodeRef(row.warehouseTo),
    responsible: encodeRef(row.responsible),
    register: encodeRef(row.register),
});

const getHistory = async (req, res, next) => {
    try {
        const filters = parseHistoryFilters(req.query);
        const pagination = parsePagination(req.query);

        const [result, summary] = await Promise.all([
            TransactionHistoryService.list(filters, pagination),
            TransactionHistoryService.summary(filters),
        ]);

        res.status(200).json({ ...result, rows: result.rows.map(encodeTransaction), summary });
    } catch (error) {
        next(error);
    }
};

const getHistoryFilters = async (req, res, next) => {
    try {
        const { warehouses, responsibles, products } = await TransactionHistoryService.filterOptions();
        res.status(200).json({
            warehouses: warehouses.map(encodeRef),
            responsibles: responsibles.map(encodeRef),
            products: products.map(encodeRef),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getHistory,
    getHistoryFilters,
    parseHistoryFilters,
};
