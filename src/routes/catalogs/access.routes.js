const { Router } = require('express');
const AccessController = require('../../controllers/catalogs/access.controller');
const authJwt = require('../../middlewares/auth.middleware');

const router = Router();

/**
 * @openapi
 * /access/me:
 *   get:
 *     summary: Acceso efectivo de quien hace la petición (perfil, permisos por módulo y bodegas)
 *     tags: [Access]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: isSuper, profile, permissions y warehouseIds (null = todas)
 */
router.get('/me', AccessController.getMyAccess);

// Todo lo demás es la administración de accesos: solo el administrador del panel.
router.use(authJwt.isPanelAdmin);

/**
 * @openapi
 * /access/catalog:
 *   get:
 *     summary: Catálogo de módulos y acciones disponibles para armar un perfil
 *     tags: [Access]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de módulos con su grupo y acciones
 *       403:
 *         description: Solo el administrador
 */
router.get('/catalog', AccessController.getCatalog);

/**
 * @openapi
 * /access/profiles:
 *   get:
 *     summary: Perfiles de acceso con el número de personas asignadas
 *     tags: [Access]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de perfiles
 *   post:
 *     summary: Crear un perfil de acceso
 *     tags: [Access]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil creado
 *       400:
 *         description: Nombre vacío o repetido, o bodega inexistente
 */
router.get('/profiles', AccessController.getProfiles);
router.post('/profiles', AccessController.createProfile);

/**
 * @openapi
 * /access/profiles/{profile_id}:
 *   put:
 *     summary: Actualizar un perfil de acceso
 *     tags: [Access]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *   delete:
 *     summary: Eliminar un perfil que no esté asignado a nadie
 *     tags: [Access]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil eliminado
 *       400:
 *         description: El perfil está asignado a alguien
 */
router.put('/profiles/:profile_id', AccessController.updateProfile);
router.delete('/profiles/:profile_id', AccessController.deleteProfile);

/**
 * @openapi
 * /access/people:
 *   get:
 *     summary: Usuarios y personal activos con su perfil asignado
 *     tags: [Access]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de personas
 *   put:
 *     summary: Asignar (o quitar) un perfil a una o varias personas
 *     tags: [Access]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asignación guardada
 */
router.get('/people', AccessController.getPeople);
router.put('/people', AccessController.assignProfile);

module.exports = router;
