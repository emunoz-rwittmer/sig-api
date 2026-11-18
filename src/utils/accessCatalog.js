/**
 * Catálogo único de módulos y acciones del sistema. De aquí leen la pantalla
 * "Accesos", el menú y las rutas del front, y las validaciones de la API.
 *
 * `legacy` guarda qué roles veían cada módulo antes de los perfiles (copiado de
 * los menús). Solo lo usa `npm run access:seed` para crear los perfiles
 * equivalentes; no decide ningún acceso en tiempo de ejecución.
 */

const VIEW = { key: 'view', label: 'Ver' };
const EDIT = { key: 'edit', label: 'Crear y editar' };
const DELETE = { key: 'delete', label: 'Eliminar' };
const BASE = [VIEW, EDIT, DELETE];

const GERENCIA = ['gerencia_gps', 'gerencia_uio'];
const ADMIN_PANEL = ['admin', 'rrhh', ...GERENCIA];
const INVENTORY_PANEL = ['admin', 'cavilar', 'rrhh', ...GERENCIA];
const EVALUATIONS_PANEL = ['admin', 'psicologos', 'rrhh', ...GERENCIA];

const MODULES = [
    { group: 'Administración', key: 'users', label: 'Usuarios', legacy: { user: ['admin'] } },
    { group: 'Administración', key: 'catalogs.staff', label: 'Personal', legacy: { user: ADMIN_PANEL } },
    { group: 'Administración', key: 'catalogs.departments', label: 'Áreas', legacy: { user: ADMIN_PANEL } },
    { group: 'Administración', key: 'catalogs.positions', label: 'Cargos', legacy: { user: ADMIN_PANEL } },
    { group: 'Administración', key: 'catalogs.documentation', label: 'Documentación', legacy: { user: ADMIN_PANEL } },
    { group: 'Administración', key: 'companies', label: 'Empresas', legacy: { user: ADMIN_PANEL } },
    { group: 'Administración', key: 'yachts', label: 'Yates', legacy: { user: ADMIN_PANEL } },

    { group: 'Recursos humanos', key: 'rrhh.regulations', label: 'Reglamentos', legacy: { user: ['admin', 'rrhh'] } },
    { group: 'Recursos humanos', key: 'rrhh.inductions', label: 'Inducciones', legacy: { user: ['admin', 'rrhh'] } },
    { group: 'Recursos humanos', key: 'rrhh.surveys', label: 'Encuestas', legacy: { user: ['admin', 'rrhh', 'psicologos'] } },
    { group: 'Recursos humanos', key: 'rrhh.training', label: 'Infórmate', legacy: { user: ['admin', 'rrhh'] } },
    { group: 'Recursos humanos', key: 'rrhh.formats', label: 'Formularios y solicitudes', legacy: { user: ['admin', 'rrhh'] } },

    {
        group: 'Operaciones', key: 'comment_cards', label: 'Comment Cards',
        legacy: { user: ['admin', 'psicologos', ...GERENCIA], staff: ['operaciones_gps', 'operaciones_uio', 'marketing', 'psicologos'] },
    },
    { group: 'Operaciones', key: 'evaluations', label: 'Evaluaciones (gestión y dashboard)', legacy: { user: EVALUATIONS_PANEL } },
    { group: 'Operaciones', key: 'evaluations.sent', label: 'Evaluaciones enviadas', legacy: { user: ADMIN_PANEL } },
    {
        group: 'Operaciones', key: 'indicators', label: 'Indicadores',
        legacy: {
            user: ['admin', 'rrhh', 'cavilar', 'psicologos', ...GERENCIA],
            staff: ['financiero', 'operaciones_uio', 'operaciones_gps', 'logistica_uio', 'marketing', ...GERENCIA],
        },
    },
    {
        group: 'Operaciones', key: 'bar', label: 'Bar',
        legacy: { user: ['admin', 'gerencia_uio'], staff: ['barman', 'financiero', 'operaciones_gps'] },
    },

    {
        group: 'Inventario', key: 'inventory.stock', label: 'Inventario', usesWarehouses: true,
        legacy: { user: INVENTORY_PANEL, staff: ['operaciones_gps', 'logistica_uio', 'logistica_gps', ...GERENCIA] },
    },
    {
        group: 'Inventario', key: 'inventory.transactions', label: 'Transacciones', usesWarehouses: true,
        actions: [...BASE, { key: 'adjust', label: 'Ajustar stock' }],
        legacy: { user: INVENTORY_PANEL, staff: ['logistica_uio', ...GERENCIA] },
    },
    {
        group: 'Inventario', key: 'inventory.registers', label: 'Registros', usesWarehouses: true,
        actions: [...BASE, { key: 'resolve', label: 'Aplicar ajuste de novedad' }],
        legacy: { user: INVENTORY_PANEL, staff: ['operaciones_gps', 'logistica_uio', 'logistica_gps', ...GERENCIA] },
    },
    {
        group: 'Inventario', key: 'inventory.orders', label: 'Pedidos',
        actions: [...BASE, { key: 'process', label: 'Procesar pedido' }],
        legacy: { user: INVENTORY_PANEL, staff: ['logistica_uio', ...GERENCIA] },
    },
    {
        group: 'Inventario', key: 'inventory.requests', label: 'Requerimientos de yates',
        actions: [...BASE, { key: 'process', label: 'Procesar requerimiento' }],
        legacy: { user: INVENTORY_PANEL, staff: ['operaciones_gps', 'capitan', 'logistica_gps', ...GERENCIA] },
    },
    {
        group: 'Inventario', key: 'inventory.guides', label: 'Guías de remisión',
        legacy: { user: INVENTORY_PANEL, staff: ['logistica_uio', ...GERENCIA] },
    },

    {
        group: 'Mantenimiento', key: 'maintenance.book', label: 'Libro de mantenimiento',
        legacy: { user: ['admin', ...GERENCIA], staff: ['jefe_mantenimiento', 'mantenimiento', ...GERENCIA] },
    },
    {
        group: 'Mantenimiento', key: 'maintenance.rules', label: 'Reglas',
        legacy: { user: ['admin', ...GERENCIA], staff: ['jefe_mantenimiento', 'mantenimiento', ...GERENCIA] },
    },
    {
        group: 'Mantenimiento', key: 'maintenance.log', label: 'Registro de mantenimientos',
        legacy: { user: ['admin', ...GERENCIA], staff: ['jefe_mantenimiento', 'mantenimiento', ...GERENCIA] },
    },
].map((module) => ({ ...module, actions: module.actions ?? BASE, usesWarehouses: Boolean(module.usesWarehouses) }));

/** Lo que ve el front: sin los datos de migración. */
const getPublicCatalog = () => MODULES.map(({ legacy: _legacy, ...module }) => module);

/** Deja solo módulos y acciones que existen; cualquier acción implica poder ver. */
function sanitizePermissions(permissions) {
    const clean = {};
    for (const module of MODULES) {
        const requested = Array.isArray(permissions?.[module.key]) ? permissions[module.key] : [];
        const actions = module.actions.map((action) => action.key).filter((key) => requested.includes(key));
        if (actions.length) clean[module.key] = actions.includes('view') ? actions : ['view', ...actions];
    }
    return clean;
}

/** Permisos equivalentes a lo que un rol veía antes de los perfiles (todas las acciones). */
function legacyPermissionsForRole(role) {
    const permissions = {};
    for (const module of MODULES) {
        const roles = [...(module.legacy?.user ?? []), ...(module.legacy?.staff ?? [])];
        if (roles.includes(role)) permissions[module.key] = module.actions.map((action) => action.key);
    }
    return permissions;
}

module.exports = { MODULES, getPublicCatalog, sanitizePermissions, legacyPermissionsForRole };
