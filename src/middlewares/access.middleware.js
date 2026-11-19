const AccessService = require('../services/catalogs/access.services');
const Utils = require('../utils/Utils');
const AppError = require('../errors/AppError');

const decode = (value) => {
    try {
        return Utils.decode(value);
    } catch {
        return undefined;
    }
};

/** Acceso de quien hace la petición; se consulta una sola vez por petición. */
const loadAccess = async (req) => {
    if (!req.access) {
        const id = decode(req.userId);
        req.access = await AccessService.getAccessFor({
            kind: req.userKind,
            id: Number.isInteger(id) ? id : null,
            rol: req.userRol,
        });
    }
    return req.access;
};

/** Bodegas a las que está limitado el perfil; null = todas (sin perfil, administrador o perfil sin límite). */
const warehouseScope = async (req) => {
    const access = await loadAccess(req);
    return !access.isSuper && access.profile ? access.warehouseIds : null;
};

/**
 * Exige un permiso del perfil. `checks` son pares [módulo, acción] y basta con uno.
 * Quien todavía no tiene perfil sigue por rol: `legacyRoles` conserva el límite de
 * roles que la ruta ya tenía (sin él, pasa como antes).
 */
const requireAccess = (checks, legacyRoles) => async (req, res, next) => {
    try {
        const access = await loadAccess(req);
        if (access.isSuper) return next();
        if (!access.profile) {
            if (!legacyRoles || legacyRoles.includes(req.userRol)) return next();
            return res.status(403).json({ data: 'Rol no autorizado' });
        }
        if (checks.some(([module, action]) => access.permissions[module]?.includes(action))) return next();
        return next(new AppError('Tu perfil no permite esta acción', 403));
    } catch (error) {
        return next(error);
    }
};

/**
 * Las bodegas que toca la petición deben estar en el perfil. `pick` devuelve los
 * ids (numéricos o codificados); los inválidos se dejan pasar para que el
 * controlador responda su 400 de siempre.
 */
const requireWarehouses = (pick) => async (req, res, next) => {
    try {
        const scope = await warehouseScope(req);
        if (!scope) return next();
        const ids = (await pick(req))
            .map((value) => (typeof value === 'number' ? value : decode(value)))
            .filter(Number.isInteger);
        if (ids.every((id) => scope.includes(id))) return next();
        return next(new AppError('Tu perfil no incluye esa bodega', 403));
    } catch (error) {
        return next(error);
    }
};

/**
 * Protege un grupo de rutas por el método: POST/PUT/PATCH piden "editar" y DELETE
 * "eliminar" en alguno de `modules`. Con `reads`, los GET piden "ver" (solo para
 * rutas que son de gestión; los catálogos que otros módulos leen quedan abiertos).
 * `selfService` son rutas que cualquiera usa sobre lo suyo (firmar, responder...).
 */
const guard = (modules, { reads = false, legacyRoles, selfService = [] } = {}) => (req, res, next) => {
    const read = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if ((read && !reads) || selfService.some((pattern) => pattern.test(req.path))) return next();
    const action = read ? 'view' : req.method === 'DELETE' ? 'delete' : 'edit';
    return requireAccess(modules.map((module) => [module, action]), legacyRoles)(req, res, next);
};

module.exports = { loadAccess, warehouseScope, requireAccess, requireWarehouses, guard };
