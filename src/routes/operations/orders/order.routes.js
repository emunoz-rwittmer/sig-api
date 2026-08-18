const { Router } = require('express');
const OrderController  = require ('../../../controllers/operations/orders/orders.controller');
const { uploadExcelFile } = require('../../../utils/uploadConfiguration');

const router = Router();

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Listar todas las órdenes
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de órdenes con su empresa, responsable e items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de orden codificado (hashids)
 *                   companyId:
 *                     type: string
 *                     description: ID de empresa codificado (hashids)
 *                   name:
 *                     type: string
 *                     nullable: true
 *                   status:
 *                     type: string
 *                   guide:
 *                     type: string
 *                     nullable: true
 *                   company:
 *                     type: object
 *                   responsible:
 *                     type: object
 *                   orderItems:
 *                     type: array
 *                     items:
 *                       type: object
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 *   post:
 *     summary: Crear una orden a partir de un archivo Excel
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [companyId, userId, status, file]
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: ID de empresa codificado (hashids)
 *               userId:
 *                 type: string
 *                 description: ID de responsable codificado (hashids)
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *               guide:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo Excel con columnas sku, product, quantity y originalQuantity
 *     responses:
 *       200:
 *         description: Orden creada
 *       400:
 *         description: Archivo Excel requerido o ID codificado inválido
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/',OrderController.getAllOrders);

/**
 * @openapi
 * /orders/{order_id}:
 *   get:
 *     summary: Obtener una orden por ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de orden codificado (hashids)
 *     responses:
 *       200:
 *         description: Orden encontrada con su empresa e items
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error inesperado
 *   put:
 *     summary: Actualizar una orden
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de orden codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *               guide:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Orden actualizada
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Orden no encontrada
 *       500:
 *         description: Error inesperado
 */
router.get('/:order_id',OrderController.getOrderById);
router.post('/', uploadExcelFile, OrderController.createOrder);
router.put('/:order_id', OrderController.updateOrder);

//ITEMS ORDER
/**
 * @openapi
 * /orders/deleteItem/{item_id}:
 *   delete:
 *     summary: Eliminar un item de una orden
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: item_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del item codificado (hashids)
 *     responses:
 *       200:
 *         description: Item eliminado
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Item no encontrado
 *       500:
 *         description: Error inesperado
 */
router.delete('/deleteItem/:item_id', OrderController.deleteItem);

module.exports = router;