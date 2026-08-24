const { Router } = require('express');
const ProductController = require('../../../controllers/operations/inventory/products.controller');

const router = Router();

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Listar todos los productos con sus configuraciones
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   sku:
 *                     type: string
 *                   type:
 *                     type: string
 *                   unit:
 *                     type: string
 *                   presentationQuantity:
 *                     type: number
 *                   active:
 *                     type: boolean
 *                   configurations:
 *                     type: array
 *                     items:
 *                       type: object
 */
router.get('/', ProductController.getProducts);

/**
 * @openapi
 * /products/allProductsWithConfigurations:
 *   get:
 *     summary: Listar configuraciones de productos activas con su producto y bodegas asociadas
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de configuraciones de productos
 *       500:
 *         description: Error inesperado
 */
router.get('/allProductsWithConfigurations', ProductController.getProductsWithConfigurations);

/**
 * @openapi
 * /products/findProduct/{sku}:
 *   get:
 *     summary: Buscar un producto por su SKU
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *         description: SKU del producto (los ceros a la izquierda se ignoran)
 *     responses:
 *       200:
 *         description: Producto encontrado
 *       404:
 *         description: Producto no encontrado
 */
router.get('/findProduct/:sku', ProductController.findProduct);

/**
 * @openapi
 * /products/{product_id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de producto codificado (hashids)
 *     responses:
 *       200:
 *         description: Producto encontrado
 *       400:
 *         description: ID codificado inválido
 *       404:
 *         description: Producto no encontrado
 *   delete:
 *     summary: Eliminar un producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de producto codificado (hashids)
 *     responses:
 *       200:
 *         description: Producto eliminado
 *       400:
 *         description: ID codificado inválido
 *       404:
 *         description: Producto no encontrado
 */
router.get('/:product_id', ProductController.getProduct);

/**
 * @openapi
 * /products/createProduct:
 *   post:
 *     summary: Crear un producto, opcionalmente con configuraciones
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku]
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               type:
 *                 type: string
 *               unit:
 *                 type: string
 *               presentationQuantity:
 *                 type: number
 *               configurations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Producto creado
 *       400:
 *         description: sku faltante o SKU ya existente
 */
router.post('/createProduct', ProductController.createProduct);

/**
 * @openapi
 * /products/updateProduct/{product_id}:
 *   put:
 *     summary: Actualizar un producto y sus configuraciones
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de producto codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku]
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               type:
 *                 type: string
 *               unit:
 *                 type: string
 *               presentationQuantity:
 *                 type: number
 *               configurations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   description: Configuraciones existentes (con id) se actualizan; sin id se crean; las omitidas se eliminan
 *     responses:
 *       200:
 *         description: Producto actualizado
 *       400:
 *         description: sku faltante o ID codificado inválido
 *       404:
 *         description: Producto no encontrado
 */
router.put('/updateProduct/:product_id', ProductController.updateProduct);
router.delete('/:product_id', ProductController.deleteProduct);
//stock
/**
 * @openapi
 * /products/{warehouse_id}/stocks:
 *   get:
 *     summary: Listar el stock de productos de una bodega
 *     tags: [Products]
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
 *         description: Lista de stock con totales de ingreso, egreso y consumo de bar
 *       400:
 *         description: ID codificado inválido
 */
router.get('/:warehouse_id/stocks', ProductController.getProductsByWarehouse);

/**
 * @openapi
 * /products/upadate/stock/{stock_id}:
 *   put:
 *     summary: Actualizar la cantidad de un registro de stock
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stock_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de stock codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity, userId, responsable]
 *             properties:
 *               quantity:
 *                 type: number
 *               userId:
 *                 type: string
 *                 description: ID de usuario codificado (hashids)
 *               responsable:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock actualizado (o sin cambios si los datos son iguales a los actuales)
 *       400:
 *         description: quantity/responsable inválidos o ID codificado inválido
 *       404:
 *         description: Stock no encontrado
 */
router.put('/upadate/stock/:stock_id', ProductController.updateStock);
//configuration
/**
 * @openapi
 * /products/configurations/switchConfiguration/{configuration_id}:
 *   put:
 *     summary: Actualizar (activar/desactivar u otros campos de) una configuración de producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: configuration_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de configuración
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuración actualizada
 *       404:
 *         description: Configuración no encontrada
 */
router.put('/configurations/switchConfiguration/:configuration_id', ProductController.switchConfirguration);


module.exports = router;