// Crea un perfil de acceso por cada rol en uso, con lo mismo que ese rol veía en el
// menú, y lo asigna a quienes tienen ese rol y aún no tienen perfil. Así nadie pierde
// acceso al pasar de roles a perfiles. Por defecto es un dry-run:
//
//   npm run access:seed                                   (simula)
//   npm run access:seed -- --apply --db=<DB_NAME>         (escribe)
//
// Se puede repetir: no duplica perfiles ni cambia a quien ya tiene uno. El rol
// "admin" no recibe perfil: el administrador del panel entra a todo.

require('dotenv').config();
const db = require('../utils/database');
const { legacyPermissionsForRole } = require('../utils/accessCatalog');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DB_ARG = args.find((value) => value.startsWith('--db='))?.split('=')[1];

// Bodegas que cada rol manejaba antes (lo que hacía inventoryTransaction.utils en el front).
const WAREHOUSE_SCOPE = {
    logistica_uio: (warehouse) => warehouse.location === 'Quito' || ['Transferencia', 'Bar'].includes(warehouse.type),
    logistica_gps: (warehouse) => warehouse.location === 'Galapagos',
    operaciones_gps: (warehouse) => warehouse.location === 'Galapagos',
};

const run = async () => {
    await db.authenticate();
    const [[{ name: dbName }]] = await db.query('SELECT DATABASE() name');
    console.log(`Base: ${dbName} @ ${db.config.host} · ${APPLY ? 'APLICANDO CAMBIOS' : 'dry-run (no escribe)'}`);
    if (APPLY && DB_ARG !== dbName) {
        throw new Error(`Para aplicar, confirma la base con --db=${dbName}`);
    }

    const t = await db.transaction();
    const q = async (sql, replacements = {}) => (await db.query(sql, { replacements, transaction: t }))[0];
    const now = new Date();

    try {
        const warehouses = await q("SELECT id, location, type FROM warehouses WHERE type <> 'De baja'");
        const roles = await q(`
            SELECT r.id, r.name,
                (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.active = 1) users,
                (SELECT COUNT(*) FROM staffs s WHERE s.role_id = r.id AND s.active = 1) staffs
            FROM roles r WHERE r.name <> 'admin' ORDER BY r.name`);

        for (const role of roles) {
            if (!role.users && !role.staffs) continue;

            const name = `Rol: ${role.name}`;
            const permissions = legacyPermissionsForRole(role.name);
            const scope = WAREHOUSE_SCOPE[role.name];
            const warehouseIds = scope ? warehouses.filter(scope).map((warehouse) => warehouse.id) : null;

            let [profile] = await q('SELECT id FROM access_profiles WHERE name = :name', { name });
            if (!profile) {
                const result = await q(`
                    INSERT INTO access_profiles (name, description, permissions, warehouse_ids, createdAt, updatedAt)
                    VALUES (:name, :description, :permissions, :warehouseIds, :now, :now)`, {
                    name,
                    description: `Creado automáticamente a partir del rol ${role.name}`,
                    permissions: JSON.stringify(permissions),
                    warehouseIds: warehouseIds ? JSON.stringify(warehouseIds) : null,
                    now,
                });
                profile = { id: result };
            }

            const users = await q('UPDATE users SET access_profile_id = :id WHERE role_id = :role AND access_profile_id IS NULL', { id: profile.id, role: role.id });
            const staffs = await q('UPDATE staffs SET access_profile_id = :id WHERE role_id = :role AND access_profile_id IS NULL', { id: profile.id, role: role.id });
            console.log(`${name}: ${Object.keys(permissions).length} módulos, ${warehouseIds ? `${warehouseIds.length} bodegas` : 'todas las bodegas'}, asignado a ${users.affectedRows} usuario(s) y ${staffs.affectedRows} staff`);
        }

        if (APPLY) await t.commit();
        else await t.rollback();
        console.log(APPLY ? 'Cambios aplicados.' : 'Dry-run: no se escribió nada.');
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

run()
    .then(() => db.close())
    .catch(async (error) => {
        console.error('ERROR:', error.message);
        await db.close();
        process.exit(1);
    });
