const Staff = require('../../../models/catalogs/staff.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const requestItems = require('../../../models/operations/yachtRequest/requestItems.models');
const Request = require('../../../models/operations/yachtRequest/request.models');
const { Op, QueryTypes, literal } = require('sequelize');
const db = require('../../../utils/database');
const RequestItems = require('../../../models/operations/yachtRequest/requestItems.models');
const ProductConfiguration = require('../../../models/operations/inventory/productConfiguration');
const Product = require('../../../models/operations/inventory/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const AppError = require('../../../errors/AppError');

// Los registros se guardan en UTC; el año y el mes de negocio se cuentan en hora de Ecuador (UTC-5).
const ECUADOR_UTC_OFFSET_HOURS = 5;
const ecuadorMidnightUtc = (year, month) => new Date(Date.UTC(year, month, 1, ECUADOR_UTC_OFFSET_HOURS));

class RequestService {
    static async getAllRequests() {
        try {
            const result = await Request.findAll({
                include: [{
                    model: Warehouse,
                    as: 'warehouse',
                }, {
                    model: requestItems,
                    as: 'requestItems',
                }, {
                    model: Staff,
                    as: 'responsible',
                    attributes: ['id', 'firstName', 'lastName']
                }],
                order: [['createdAt', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Listado paginado de requerimientos para la pantalla principal. Aplica los
     * filtros en SQL y calcula los totales con un único GROUP BY, sin traer los
     * items de cada requerimiento (solo su cantidad).
     *
     * `warehouseIds` limita el universo visible (ej. la flota de un capitán);
     * `warehouseId`, `status` y `search` solo afectan a la tabla y a los KPIs de
     * yate/estado; `group` afecta además a los totales por yate.
     */
    static async searchRequests({ year, warehouseIds, warehouseId, group, status, search, page, pageSize }) {
        const from = ecuadorMidnightUtc(year, 0);
        const to = ecuadorMidnightUtc(year + 1, 0);
        const now = new Date(Date.now() - ECUADOR_UTC_OFFSET_HOURS * 3600 * 1000);
        const monthStart = ecuadorMidnightUtc(now.getUTCFullYear(), now.getUTCMonth());
        const scopeIds = warehouseIds?.length ? warehouseIds : null;

        const aggregates = await db.query(
            `SELECT r.warehouse_id AS warehouseId, r.\`group\` AS requestGroup, r.status AS status,
                    COUNT(DISTINCT r.id) AS total,
                    COUNT(DISTINCT CASE WHEN r.createdAt >= :monthStart THEN r.id END) AS thisMonth,
                    COUNT(ri.id) AS products,
                    MAX(r.createdAt) AS lastAt
             FROM requests r
             LEFT JOIN request_items ri ON ri.request_id = r.id
             WHERE r.createdAt >= :from AND r.createdAt < :to
               ${scopeIds ? 'AND r.warehouse_id IN (:scopeIds)' : ''}
             GROUP BY r.warehouse_id, r.\`group\`, r.status`,
            { replacements: { from, to, monthStart, scopeIds }, type: QueryTypes.SELECT }
        );

        const yearRows = await db.query(
            `SELECT DISTINCT YEAR(DATE_SUB(createdAt, INTERVAL ${ECUADOR_UTC_OFFSET_HOURS} HOUR)) AS year
             FROM requests
             ${scopeIds ? 'WHERE warehouse_id IN (:scopeIds)' : ''}`,
            { replacements: { scopeIds }, type: QueryTypes.SELECT }
        );

        const num = (value) => Number(value) || 0;
        const sum = (rows, field) => rows.reduce((acc, row) => acc + num(row[field]), 0);
        const byGroup = group ? aggregates.filter((row) => row.requestGroup === group) : aggregates;
        const kpiRows = warehouseId ? byGroup.filter((row) => row.warehouseId === warehouseId) : byGroup;

        const types = { all: sum(aggregates, 'total') };
        aggregates.forEach((row) => {
            types[row.requestGroup] = (types[row.requestGroup] ?? 0) + num(row.total);
        });

        const yachts = [...new Set(byGroup.map((row) => row.warehouseId))].map((id) => {
            const rows = byGroup.filter((row) => row.warehouseId === id);
            const lastAt = rows.reduce((acc, row) => (!acc || row.lastAt > acc ? row.lastAt : acc), null);
            return {
                warehouseId: id,
                total: sum(rows, 'total'),
                pending: sum(rows.filter((row) => row.status === 'Pendiente'), 'total'),
                lastAt,
            };
        });

        const where = { createdAt: { [Op.gte]: from, [Op.lt]: to } };
        if (scopeIds) where.warehouseId = { [Op.in]: scopeIds };
        if (warehouseId) where.warehouseId = warehouseId;
        if (group) where.group = group;
        if (status) where.status = status;
        if (search) {
            where[Op.and] = [{
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    literal(`CONCAT(responsible.first_name, ' ', responsible.last_name) LIKE ${db.escape(`%${search}%`)}`),
                ],
            }];
        }

        const responsibleInclude = { model: Staff, as: 'responsible', attributes: ['id', 'firstName', 'lastName'] };
        const [total, rows] = await Promise.all([
            Request.count({ where, include: [{ ...responsibleInclude, attributes: [] }] }),
            Request.findAll({
                where,
                attributes: ['id', 'name', 'group', 'status', 'warehouseId', 'createdAt',
                    [literal('(SELECT COUNT(*) FROM request_items ri WHERE ri.request_id = request.id)'), 'productCount']],
                include: [{ model: Warehouse, as: 'warehouse', attributes: ['name'] }, responsibleInclude],
                order: [['createdAt', 'DESC'], ['id', 'DESC']],
                limit: pageSize,
                offset: (page - 1) * pageSize,
            }),
        ]);

        return {
            rows,
            total,
            years: yearRows.map((row) => num(row.year)).sort((a, b) => b - a),
            types,
            yachts,
            summary: {
                total: sum(kpiRows, 'total'),
                thisMonth: sum(kpiRows, 'thisMonth'),
                pending: sum(kpiRows.filter((row) => row.status === 'Pendiente'), 'total'),
                processed: sum(kpiRows.filter((row) => row.status === 'Procesado'), 'total'),
                products: sum(kpiRows, 'products'),
            },
        };
    }

    static async getRequestById(requestId) {
        try {

            const result = await Request.findOne({
                where: { id: requestId },
                attributes: ['id', 'name', 'group', 'warehouseId', 'status', 'pax', 'cruise', 'supplyDate', 'createdAt', 'deliveryPort', 'requiredDate', 'note'],
                include: [
                    {
                        model: RequestItems,
                        as: 'requestItems',
                        include: [{
                            model: ProductConfiguration,
                            as: 'configuracion',
                            attributes: { exclude: ['createdAt', 'updatedAt'] },
                            include: [{
                                model: Product,
                                as: 'product',
                            }]
                        }]
                    },
                    {
                        model: Warehouse,
                        as: 'warehouse',
                        attributes: ['name', 'yachtId']
                    },
                    {
                        model: Staff,
                        as: 'responsible',
                        attributes: ['id', 'firstName', 'lastName']
                    }
                ],
                order: [
                    [
                        { model: RequestItems, as: 'requestItems' },
                        { model: ProductConfiguration, as: 'configuracion' },
                        { model: Product, as: 'product' },
                        'name',
                        'ASC'
                    ]
                ]
            });

            if (!result) return null;

            const currentPlain = result.get({ plain: true });
            if (currentPlain.group === 'drink_request') {
                const warehouse = await Warehouse.findOne({
                    where: { yachtId: result.warehouse.yachtId , type: 'Bar'}
                })

                currentPlain.warehouseId = warehouse.id
            }
            return currentPlain;
        } catch (error) {
            throw error;
        }
    }

    static async createRequest(data) {
        const transaction = await db.transaction();

        try {
            const result = await Request.create(data, { transaction });

            const productsRequest = data.products.map(item => ({
                ...item,
                requestId: result.id,
            }));

            await requestItems.bulkCreate(productsRequest, { transaction });

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async createDrinkRequest(yachtId, userId) {
        const transaction = await db.transaction();

        try {

            const warehouse = await Warehouse.findOne({
                where: { type: 'Bar', yachtId },
                transaction
            });

            const stocks = await Stock.findAll({
                where: { warehouseId: warehouse.id },
                include: [{
                    model: Product,
                    as: 'product',
                    include: [{
                        model: ProductConfiguration,
                        as: 'configurations'
                    }],
                }],
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            const currenStocks = stocks.map(r => r.get({ plain: true }));

            const formattedDate = new Date();
            const day = formattedDate.getDate();
            const month = formattedDate.getMonth() + 1;
            const year = formattedDate.getFullYear();

            const warehouseRequest = await Warehouse.findOne({
                where: { type: 'Yate', yachtId },
                transaction
            });


            const result = await Request.create({
                warehouseId: warehouseRequest.id,
                userId,
                group: 'drink_request',
                status: 'Pendiente',
                name: `drink_request_${day}${month}${year}`,
            }, { transaction });

            const productsRequest = stocks.map(item => ({
                requestId: result.id,
                configurationId: item.product.configurations[0]?.id,
                stock: item.quantity,
                order: 0,
                quantity: 0
            }));

            await requestItems.bulkCreate(productsRequest, { transaction });

            await transaction.commit();
            return result;
        } catch (error) {
            console.log(error)
            await transaction.rollback();
            throw error;
        }
    }

    static async updateRequest(data, id) {

        if (data.items && (Array.isArray(data.items) && data.items.length > 0)) {
            for (const item of data.items) {
                const quantity = parseInt(item.quantity, 10);
                if (isNaN(quantity) || quantity < 0) {
                    throw new AppError(`Invalid quantity for item ${item.id}`, 400);
                }
            }
        }

        const transaction = await db.transaction();

        try {
            const result = await Request.update(data,
                { where: { id }, transaction });

            // Update items if provided
            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                await Promise.all(
                    data.items.map((item) => {
                        const quantity = parseInt(item.quantity, 10);
                        return requestItems.update(
                            { quantity },
                            { where: { id: item.id }, transaction }
                        );
                    })
                );
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = RequestService;