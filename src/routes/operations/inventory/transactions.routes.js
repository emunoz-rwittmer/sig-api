const { Router } = require('express');
const TransactionController  = require ('../../../controllers/operations/inventory/transactions.controller');
const TransactionHistoryController = require('../../../controllers/operations/inventory/transactionHistory.controller');

const router = Router();

/**
 * @openapi
 * /transactions/history:
 *   get:
 *     summary: Historial paginado de transacciones de inventario con filtros y totales
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Inicio del rango (ISO, inclusive)
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: Fin del rango (ISO, inclusive)
 *       - in: query
 *         name: movements
 *         schema: { type: string, example: 'ENTRY,TRANSFER' }
 *         description: Movimientos separados por coma (ENTRY, TRANSFER, EXIT, BAR_CONSUMPTION, ADJUST)
 *       - in: query
 *         name: warehouseId
 *         schema: { type: string }
 *         description: Bodega involucrada como origen o destino (hashid)
 *       - in: query
 *         name: warehouseFromId
 *         schema: { type: string }
 *         description: Bodega de origen (hashid)
 *       - in: query
 *         name: warehouseToId
 *         schema: { type: string }
 *         description: Bodega de destino (hashid)
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Responsable (hashid)
 *       - in: query
 *         name: productId
 *         schema: { type: string }
 *         description: Producto (hashid)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Texto libre sobre producto, SKU, número de registro o referencia
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 25, maximum: 100 }
 *     responses:
 *       200:
 *         description: "{ rows, total, page, pageSize, totalPages, summary: { total, byMovement, products, responsibles } }"
 *       400:
 *         description: Fecha, movimiento o ID codificado inválido
 */
router.get('/history', TransactionHistoryController.getHistory);

/**
 * @openapi
 * /transactions/history/filters:
 *   get:
 *     summary: Opciones para los filtros del historial (bodegas, responsables y productos con movimientos)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ warehouses, responsibles, products }"
 */
router.get('/history/filters', TransactionHistoryController.getHistoryFilters);

/**
 * @openapi
 * /transactions/productEntryInWarehouse/{warehouse_id}:
 *   post:
 *     summary: Registrar el ingreso de un producto de una orden a una bodega
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouse_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de bodega (numérico, sin codificar)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, sku, quantity]
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID del item de orden
 *               product:
 *                 type: string
 *               sku:
 *                 type: string
 *               quantity:
 *                 type: number
 *               companyId:
 *                 type: string
 *               user:
 *                 type: string
 *                 description: ID de usuario codificado (hashids)
 *     responses:
 *       200:
 *         description: Stock actualizado y transacción registrada
 *       400:
 *         description: Bodega/item inválido, cantidad inválida, sku faltante, transacción duplicada o item de orden no encontrado
 */
router.post('/productEntryInWarehouse/:warehouse_id', TransactionController.productEntryInWarehouse);

/**
 * @openapi
 * /transactions/transactionBetweenWarehouse:
 *   post:
 *     summary: Transferir productos entre dos bodegas, generando un registro con contador consecutivo
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [products, warehouseFromId, warehouseToId, userId]
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID del producto codificado (hashids)
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               warehouseFromId:
 *                 type: string
 *                 description: ID de bodega origen codificado (hashids)
 *               warehouseToId:
 *                 type: string
 *                 description: ID de bodega destino codificado (hashids)
 *               userId:
 *                 type: string
 *                 description: ID de usuario codificado (hashids)
 *               companyId:
 *                 type: string
 *                 description: ID de empresa codificado (hashids)
 *               userName:
 *                 type: string
 *               location:
 *                 type: string
 *                 description: Si es 'UIO', envía el registro a imprimir
 *     responses:
 *       200:
 *         description: Transacción completada correctamente
 *       400:
 *         description: ID codificado inválido, productos no válidos, bodegas iguales o stock insuficiente
 */
router.post('/transactionBetweenWarehouse', TransactionController.transactionWarehouse);

/**
 * @openapi
 * /transactions/incomeProductsInWarehouse:
 *   post:
 *     summary: Ingresar productos a una bodega (sin origen)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [products, warehouseToId, companyId, userId]
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID del producto codificado (hashids)
 *                     quantity:
 *                       type: number
 *               warehouseToId:
 *                 type: string
 *                 description: ID de bodega destino codificado (hashids)
 *               companyId:
 *                 type: string
 *                 description: ID de empresa codificado (hashids)
 *               userId:
 *                 type: string
 *                 description: ID de usuario codificado (hashids)
 *     responses:
 *       200:
 *         description: Transacción completada correctamente
 *       400:
 *         description: ID codificado inválido o no hay productos válidos con cantidad mayor a 0
 */
router.post('/incomeProductsInWarehouse', TransactionController.incomeProductsInWarehouse);

/**
 * @openapi
 * /transactions/updateStatusItem/{item_id}:
 *   put:
 *     summary: Actualizar el estado de un item de orden
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: item_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de item codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Elemento actualizado
 *       400:
 *         description: ID codificado inválido
 *       404:
 *         description: Elemento no encontrado
 */
router.put('/updateStatusItem/:item_id', TransactionController.updateStatusItem);

/**
 * @openapi
 * /transactions/incomeProductsRegister:
 *   post:
 *     summary: Confirmar el ingreso de un registro de transferencia (bodega puente 9 -> bodega destino), permitiendo ajustar cantidades con observaciones
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, companyId, userId, transactiones]
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID del registro codificado (hashids)
 *               companyId:
 *                 type: string
 *                 description: ID de empresa codificado (hashids)
 *               userId:
 *                 type: string
 *                 description: ID de usuario codificado (hashids)
 *               observations:
 *                 type: string
 *                 description: Requerido si alguna cantidad transaccional cambió respecto a la original
 *               transactiones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: ID de la transacción original (opcional, si se ajusta cantidad)
 *                     quantity:
 *                       type: number
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *     responses:
 *       200:
 *         description: Transacción completada correctamente
 *       400:
 *         description: ID codificado inválido, sin productos válidos, transacción original no encontrada, falta observaciones o stock insuficiente
 */
router.post('/incomeProductsRegister', TransactionController.incomeProductsRegister);

/**
 * @openapi
 * /transactions/printRegister:
 *   put:
 *     summary: Enviar un registro de transferencia a la impresora remota
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [counter, transactiones]
 *             properties:
 *               counter:
 *                 type: string
 *               empresa:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *               responsable:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *               transactiones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     quantity:
 *                       type: number
 *                     product:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *     responses:
 *       200:
 *         description: Transacción completada correctamente
 *       400:
 *         description: Error al imprimir el registro
 */
router.put('/printRegister', TransactionController.printRegister);

module.exports = router;