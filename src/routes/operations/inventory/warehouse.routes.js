const { Router } = require('express');
const WarehouseController  = require ('../../../controllers/operations/inventory/warehouse.controller');
const router = Router();

/**
 * @openapi
 * /warehouse:
 *   get:
 *     summary: Listar todas las bodegas con su cantidad de stocks
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bodegas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de bodega codificado (hashids)
 *                   name:
 *                     type: string
 *                   location:
 *                     type: string
 *                   type:
 *                     type: string
 *                   stockCount:
 *                     type: integer
 *   post:
 *     summary: Crear una bodega
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, location, type]
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bodega creada
 *       400:
 *         description: Falta name, location o type
 */
router.get('/',WarehouseController.getAllWarehouses);
router.post('/', WarehouseController.createWarehouse);

/**
 * @openapi
 * /warehouse/{warehouse_id}:
 *   put:
 *     summary: Actualizar una bodega
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouse_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de bodega codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bodega actualizada
 *       400:
 *         description: ID codificado inválido
 *       404:
 *         description: Bodega no encontrada
 *   delete:
 *     summary: Eliminar una bodega
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouse_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de bodega codificado (hashids)
 *     responses:
 *       200:
 *         description: Bodega eliminada
 *       400:
 *         description: ID codificado inválido
 *       404:
 *         description: Bodega no encontrada
 */
router.put('/:warehouse_id', WarehouseController.updateWarehouse);
router.delete('/:warehouse_id', WarehouseController.deleteWarehouse);
//stock
/**
 * @openapi
 * /warehouse/{stock_id}/stockProduct:
 *   get:
 *     summary: Obtener el detalle de un stock (producto, bodega, empresa e historial de transacciones)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stock_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de stock codificado (hashids)
 *     responses:
 *       200:
 *         description: Stock encontrado
 *       400:
 *         description: ID codificado inválido
 *       404:
 *         description: Stock no encontrado
 */
router.get('/:stock_id/stockProduct',WarehouseController.getStockProduct);


module.exports = router;