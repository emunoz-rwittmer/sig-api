// Limpieza única de datos de inventario. Por defecto es un dry-run: muestra lo que
// haría y NO escribe. Para escribir hay que nombrar la base, para no correrlo por
// error contra la equivocada:
//
//   npm run inventory:cleanup                                  (dry-run, todas las tareas)
//   npm run inventory:cleanup -- --only=transit,orders         (dry-run de algunas)
//   npm run inventory:cleanup -- --apply --db=<DB_NAME>        (escribe)
//
// Tareas:
//   transit     Deja en tránsito (UIO-GPS) solo lo que explican los registros sin recibir y las
//               novedades pendientes; el resto se saca con un ajuste "Regularización de tránsito".
//   orders      Cierra los pedidos "Pendiente" que ya no tienen ítems por ingresar.
//   units       Pone unidad "unit" a los productos DISCRETE que no la tienen.
//   linen       Marca sin control de stock los productos con stock ficticio (>= 90.000) y lo deja en 0.
//   duplicates  Fusiona productos con el mismo nombre en el que tiene configuración activa
//               y más movimientos; el otro queda inactivo y apuntando al vigente.

require('dotenv').config();
const db = require('../utils/database');
const { TRANSIT_WAREHOUSE_ID } = require('../utils/warehouses');

const args = process.argv.slice(2);
const arg = (name) => args.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
const APPLY = args.includes('--apply');
const ONLY = arg('only')?.split(',');
const FAKE_STOCK = 90000;

const run = async () => {
    await db.authenticate();
    const [[{ name: dbName }]] = await db.query('SELECT DATABASE() name');
    console.log(`Base: ${dbName} @ ${db.config.host} · ${APPLY ? 'APLICANDO CAMBIOS' : 'dry-run (no escribe)'}`);
    if (APPLY && arg('db') !== dbName) {
        throw new Error(`Para aplicar, confirma la base con --db=${dbName}`);
    }

    const t = await db.transaction();
    const q = async (sql, replacements = {}) => (await db.query(sql, { replacements, transaction: t }))[0];
    const now = new Date();

    const tasks = {
        async transit() {
            // Lo que debe haber en tránsito, en la unidad del stock: lo despachado en registros
            // sin recibir, más la diferencia (despachado - recibido) de los recibidos con
            // novedad pendiente, que se queda ahí hasta que origen aplique el ajuste.
            const rows = await q(`
                SELECT s.id, s.product_id, s.quantity, p.name, p.type, p.presentacion, IFNULL(pend.q, 0) explained
                FROM stocks s
                JOIN products p ON p.id = s.product_id
                LEFT JOIN (
                    SELECT t.product_id, r.company_id,
                        SUM(IF(t.warehouse_to_id = :transit, 1, -1) * t.quantity * IF(p2.type = 'CONSUMABLE', p2.presentacion, 1)) q
                    FROM registers r
                    JOIN transactions t ON t.register_id = r.id AND t.type = 'OUT'
                        AND (t.warehouse_to_id = :transit OR t.warehouse_from_id = :transit)
                    JOIN products p2 ON p2.id = t.product_id
                    WHERE r.isResived = 0 OR r.novelty_status = 'pendiente'
                    GROUP BY t.product_id, r.company_id
                ) pend ON pend.product_id = s.product_id AND pend.company_id <=> s.company_id
                WHERE s.warehouse_id = :transit AND s.quantity <> IFNULL(pend.q, 0)`, { transit: TRANSIT_WAREHOUSE_ID });

            let units = 0;
            for (const row of rows) {
                const residue = Number(row.quantity) - Number(row.explained);
                units += residue;
                const view = Math.abs(row.type === 'CONSUMABLE' ? residue / Number(row.presentacion) : residue);
                await q('UPDATE stocks SET quantity = :explained, updatedAt = :now WHERE id = :id', { explained: row.explained, now, id: row.id });
                await q(`INSERT INTO transactions (type, product_id, warehouse_from_id, warehouse_to_id, quantity, reason, note, createdAt, updatedAt)
                         VALUES ('ADJUST', :productId, :fromId, :toId, :quantity, 'Regularización de tránsito', 'Limpieza inicial de tránsito', :now, :now)`, {
                    productId: row.product_id,
                    fromId: residue > 0 ? TRANSIT_WAREHOUSE_ID : null,
                    toId: residue > 0 ? null : TRANSIT_WAREHOUSE_ID,
                    quantity: Math.round(view * 100) / 100,
                    now,
                });
            }
            console.log(`transit: ${rows.length} filas ajustadas, ${Math.round(units)} unidades sacadas de tránsito`);
        },

        async orders() {
            const rows = await q(`
                SELECT o.id, o.name FROM Orders o
                WHERE o.status = 'Pendiente'
                  AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id)
                  AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.status NOT IN ('ingresado', 'recibido'))`);
            if (rows.length) {
                await q("UPDATE Orders SET status = 'Procesado', updatedAt = :now WHERE id IN (:ids)", { now, ids: rows.map((row) => row.id) });
            }
            console.log(`orders: ${rows.length} pedidos cerrados (${rows.map((row) => `#${row.id}`).join(', ')})`);
        },

        async units() {
            const result = await q("UPDATE products SET unidad_medida = 'unit', updatedAt = :now WHERE unidad_medida IS NULL AND type = 'DISCRETE'", { now });
            console.log(`units: ${result.affectedRows} productos con unidad completada`);
        },

        async linen() {
            const rows = await q('SELECT DISTINCT p.id product_id, p.name FROM stocks s JOIN products p ON p.id = s.product_id WHERE s.quantity >= :fake ORDER BY p.name', { fake: FAKE_STOCK });
            const ids = rows.map((row) => row.product_id);
            rows.forEach((row) => console.log(`linen: ${row.name}`));
            if (ids.length) {
                await q('UPDATE products SET controls_stock = 0, updatedAt = :now WHERE id IN (:ids)', { now, ids });
                await q('UPDATE stocks SET quantity = 0, updatedAt = :now WHERE product_id IN (:ids)', { now, ids });
            }
            console.log(`linen: ${ids.length} productos marcados sin control de stock`);
        },

        async duplicates() {
            const products = await q(`
                SELECT p.id, p.name, p.sku,
                    (SELECT COUNT(*) FROM product_configurations c WHERE c.product_id = p.id AND c.active = 1) configs,
                    (SELECT COUNT(*) FROM transactions tx WHERE tx.product_id = p.id) txs
                FROM products p
                WHERE p.merged_into_id IS NULL AND LOWER(p.name) IN (
                    SELECT name FROM (SELECT LOWER(name) name FROM products WHERE merged_into_id IS NULL GROUP BY LOWER(name) HAVING COUNT(*) > 1) d
                )
                ORDER BY LOWER(p.name), configs DESC, txs DESC, p.id`);

            // Misma comparación que hace MySQL: sin mayúsculas ni tildes ("Jabón" = "JABON").
            const keyOf = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
            const groups = new Map();
            products.forEach((product) => groups.set(keyOf(product.name), [...(groups.get(keyOf(product.name)) ?? []), product]));

            // Tablas que apuntan al producto, aparte de stocks (que se suma fila por fila).
            const references = [
                ['transactions', 'product_id'], ['product_configurations', 'product_id'], ['product_bars', 'product_id'],
                ['recipe_details', 'productId'], ['consumer_card_item_ingredients', 'product_id'], ['laundryyachts', 'product_id'],
                ['maintenance_record_materials', 'product_id'], ['maintenance_rule_materials', 'product_id'],
            ];

            for (const [keeper, ...duplicates] of groups.values()) {
                for (const duplicate of duplicates) {
                    const stocks = await q('SELECT id, warehouse_id, company_id, quantity FROM stocks WHERE product_id = :id', { id: duplicate.id });
                    for (const stock of stocks) {
                        const [target] = await q('SELECT id FROM stocks WHERE product_id = :keeper AND warehouse_id = :warehouse AND company_id <=> :company',
                            { keeper: keeper.id, warehouse: stock.warehouse_id, company: stock.company_id });
                        if (target) {
                            await q('UPDATE stocks SET quantity = quantity + :quantity, updatedAt = :now WHERE id = :id', { quantity: stock.quantity, now, id: target.id });
                            await q('UPDATE stock_histories SET stock_id = :target WHERE stock_id = :id', { target: target.id, id: stock.id });
                            await q('DELETE FROM stocks WHERE id = :id', { id: stock.id });
                        } else {
                            await q('UPDATE stocks SET product_id = :keeper WHERE id = :id', { keeper: keeper.id, id: stock.id });
                        }
                    }
                    for (const [table, column] of references) {
                        await q(`UPDATE ${table} SET ${column} = :keeper WHERE ${column} = :id`, { keeper: keeper.id, id: duplicate.id });
                    }
                    await q('UPDATE products SET active = 0, merged_into_id = :keeper, updatedAt = :now WHERE id = :id', { keeper: keeper.id, now, id: duplicate.id });
                    console.log(`duplicates: "${duplicate.name}" ${duplicate.sku} (#${duplicate.id}) -> ${keeper.sku} (#${keeper.id})`);
                }
            }
            console.log(`duplicates: ${groups.size} grupos fusionados`);
        },
    };

    try {
        for (const [name, task] of Object.entries(tasks)) {
            if (!ONLY || ONLY.includes(name)) await task();
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
