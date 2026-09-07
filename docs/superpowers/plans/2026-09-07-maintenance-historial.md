# Historial de Mantenimiento de Yates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir desde cero el dominio de mantenimiento de yates como un historial inmutable (fecha, hora, responsable, trabajo realizado) con un catálogo informativo de reglas de periodicidad por equipo y un endpoint de "libro de mantenimiento" por yate.

**Architecture:** Sigue el patrón de capas ya usado en `comentCard`/`reports`: modelos Sequelize → `MaintenanceService` (capa de datos pura, sin `AppError`) → `MaintenanceController` (valida, decodifica ids, lanza `AppError`, llama al service, codifica la respuesta) → rutas Express con bloques `@openapi`, montadas ya con `authJwt.verifyToken` en `src/routes/index.js`.

**Tech Stack:** Node.js, Express, Sequelize (MySQL), Jest + Supertest (tests de dominio contra `.env.test`).

**Spec:** `docs/superpowers/specs/2026-09-07-maintenance-historial-design.md`

## Global Constraints

- Servicios (`MaintenanceService`) nunca lanzan `AppError` ni validan negocio — solo acceso a datos. Toda validación y decisión de status HTTP vive en el controller (patrón `comentCard.controller.js`).
- Controllers: `try { ... } catch (error) { next(error); }` en cada handler — nunca `res.status(400).json(error.message)`.
- Ids en request/response siempre pasan por `Utils.decode`/`Utils.encode` vía los helpers `decodeId`/`decodeOptionalId`/`encodeInstanceField`.
- `PUT` reemplaza el recurso completo (mismo contrato que exige `name`+`yachtId` de nuevo, no PATCH parcial) — mismo criterio que `updatePart`/`updateRule` del dominio viejo.
- Respuestas de creación/edición/aprobación devuelven `{ data: 'resource <created|updated|approved> successfully' }` (no el recurso completo) — mismo contrato que `comentCard.controller.js`. Los `GET` sí devuelven el recurso completo con ids codificados.
- Ningún `maintenance_record` se borra jamás — no existe endpoint `DELETE` para records.
- Nombres de tabla reales en BD (Sequelize pluraliza `db.define()` automáticamente, verificado empíricamente): `yacht_equipments`, `maintenance_rules`, `maintenance_rule_assignments`, `maintenance_rule_materials`, `maintenance_records`, `maintenance_record_materials`.
- Tests de dominio corren contra `.env.test` vía `tests/helpers/testApp.js` (`db.sync({force:true})`) — nunca contra el `.env` de producción.

---

### Task 1: Eliminar el dominio de mantenimiento viejo

**Files:**
- Delete: `src/models/catalogs/maintenance.models.js`
- Delete: `src/models/catalogs/maintenanceRules.models.js`
- Delete: `src/models/catalogs/maintenanceRulesPart.models.js`
- Delete: `src/models/catalogs/maintenanceMaterials.models.js`
- Delete: `src/models/catalogs/yachtParts.models.js`
- Delete: `src/controllers/catalogs/maintenance.controller.js`
- Delete: `src/services/catalogs/maintenance.services.js`
- Delete: `src/routes/catalogs/maintenance.routes.js`
- Modify: `src/models/init.models.js`
- Modify: `src/services/catalogs/yachts.services.js`
- Modify: `src/routes/index.js`

**Interfaces:**
- Produces: un árbol de código sin ninguna referencia al dominio de mantenimiento viejo; `npm test` sigue en verde (confirmado por grep previo: ningún test existente referencia `maintenance`).

- [ ] **Step 1: Confirmar que nada más depende del dominio viejo**

Run: `grep -rn "maintenance" src --include=*.js -il`
Expected: solo los 8 archivos listados arriba en "Files: Delete", más `src/models/init.models.js` y `src/services/catalogs/yachts.services.js` (que se editan, no se borran) y `src/routes/index.js`.

- [ ] **Step 2: Borrar los 8 archivos**

```bash
git rm src/models/catalogs/maintenance.models.js \
       src/models/catalogs/maintenanceRules.models.js \
       src/models/catalogs/maintenanceRulesPart.models.js \
       src/models/catalogs/maintenanceMaterials.models.js \
       src/models/catalogs/yachtParts.models.js \
       src/controllers/catalogs/maintenance.controller.js \
       src/services/catalogs/maintenance.services.js \
       src/routes/catalogs/maintenance.routes.js
```

- [ ] **Step 3: Limpiar `src/models/init.models.js`**

Elimina estas 5 líneas de requires (cerca de la línea 57):

```js
const YachtParts = require('./catalogs/yachtParts.models');
const MaintenanceRulesPart = require('./catalogs/maintenanceRulesPart.models');
const MaintenanceRules = require('./catalogs/maintenanceRules.models');
const Maintenance = require('./catalogs/maintenance.models');
const MaintenanceMaterials = require('./catalogs/maintenanceMaterials.models');
```

Y este bloque de associations (cerca de la línea 113):

```js
    YachtParts.belongsTo(Yacht, { as: 'yacht', foreignKey: 'yacht_id', });
    Yacht.hasMany(YachtParts, { as: 'parts', foreignKey: 'yacht_id', onDelete: 'CASCADE', hooks: true });

    MaintenanceRulesPart.belongsTo(YachtParts, { as: 'parte', foreignKey: 'part_id', });
    YachtParts.hasMany(MaintenanceRulesPart, { as: 'reglas', foreignKey: 'part_id', onDelete: 'CASCADE', hooks: true });

    MaintenanceRulesPart.belongsTo(MaintenanceRules, { as: 'regla', foreignKey: 'rule_id', });
    MaintenanceRules.hasMany(MaintenanceRulesPart, { as: 'partes', foreignKey: 'rule_id', onDelete: 'CASCADE', hooks: true });

    Maintenance.belongsTo(MaintenanceRulesPart, { as: 'rules_part', foreignKey: 'rules_part_id', });
    MaintenanceRulesPart.hasMany(Maintenance, { as: 'maintenances', foreignKey: 'rules_part_id', onDelete: 'CASCADE', hooks: true });

    MaintenanceMaterials.belongsTo(Maintenance, { as: 'maintenance', foreignKey: 'maintenance_id', });
    Maintenance.hasMany(MaintenanceMaterials, { as: 'materials', foreignKey: 'maintenance_id', onDelete: 'CASCADE', hooks: true });

    MaintenanceMaterials.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
    Product.hasMany(MaintenanceMaterials, { as: 'materials', foreignKey: 'product_id' });

```

- [ ] **Step 4: Limpiar imports muertos en `src/services/catalogs/yachts.services.js`**

Elimina estas 3 líneas (nunca se usaban en el archivo):

```js
const YachtParts = require('../../models/catalogs/yachtParts.models');
const MaintenanceRules = require('../../models/catalogs/maintenanceRules.models');
const MaintenanceRulesPart = require('../../models/catalogs/maintenanceRulesPart.models');
```

- [ ] **Step 5: Desmontar la ruta vieja en `src/routes/index.js`**

Elimina:

```js
const maintenanceRoutes = require("./catalogs/maintenance.routes");
```

y:

```js
  app.use("/api/maintenance", authJwt.verifyToken, maintenanceRoutes);
```

(Task 3 vuelve a agregar ambas líneas apuntando al router nuevo.)

- [ ] **Step 6: Correr el suite completo y confirmar que sigue en verde**

Run: `npm test`
Expected: todos los tests existentes pasan (ninguno dependía del dominio de mantenimiento).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: remove legacy maintenance domain

Se elimina por completo el dominio viejo (modelos, service, controller,
rutas) como paso previo a reconstruirlo desde cero según
docs/superpowers/specs/2026-09-07-maintenance-historial-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019mMDQoNgeGbZhP6qnWPdit
EOF
)"
```

---

### Task 2: Modelos nuevos + associations

**Files:**
- Create: `src/models/catalogs/yachtEquipment.models.js`
- Create: `src/models/catalogs/maintenanceRule.models.js`
- Create: `src/models/catalogs/maintenanceRuleAssignment.models.js`
- Create: `src/models/catalogs/maintenanceRuleMaterial.models.js`
- Create: `src/models/catalogs/maintenanceRecord.models.js`
- Create: `src/models/catalogs/maintenanceRecordMaterial.models.js`
- Modify: `src/models/init.models.js`
- Test: `tests/domain/catalogs-maintenance/models.test.js`

**Interfaces:**
- Produces (usado por todas las tareas siguientes): `YachtEquipment`, `MaintenanceRule`, `MaintenanceRuleAssignment`, `MaintenanceRuleMaterial`, `MaintenanceRecord`, `MaintenanceRecordMaterial` — cada uno el default export de su archivo. Aliases de association: `yacht`/`equipment`/`ruleAssignments`/`rule`/`assignments`/`recommendedMaterials`/`product`/`records`/`materials`.

- [ ] **Step 1: Escribir el test de modelos/associations (falla — los modelos no existen)**

Crea `tests/domain/catalogs-maintenance/models.test.js`:

```js
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Yacht = require('../../../src/models/catalogs/yacht.models');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRuleMaterial = require('../../../src/models/catalogs/maintenanceRuleMaterial.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('../../../src/models/catalogs/maintenanceRecordMaterial.models');
const Product = require('../../../src/models/operations/inventory/product.models');

beforeAll(async () => {
    await bootTestApp();
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - models & associations', () => {
    it('wires equipment -> rule -> record through their aliases', async () => {
        const { yacht } = await createCompanyWithYacht('Maintenance Models Co', 'Maintenance Models Yacht');
        const product = await Product.create({ name: 'Aceite 15W40', type: 'CONSUMABLE' });

        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Babor' });
        const rule = await MaintenanceRule.create({
            name: 'Cambio de aceite',
            periodicityValue: 250,
            periodicityUnit: 'horas',
        });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });
        await MaintenanceRuleMaterial.create({ ruleId: rule.id, productId: product.id, recommendedQuantity: 20 });

        const record = await MaintenanceRecord.create({
            equipmentId: equipment.id,
            yachtId: yacht.id,
            ruleId: rule.id,
            responsible: 'Juan Pérez',
            workPerformed: 'Cambio de aceite y filtro',
            performedAt: new Date('2026-09-01T14:00:00.000Z'),
        });
        await MaintenanceRecordMaterial.create({ recordId: record.id, productId: product.id, quantity: 20 });

        const reloaded = await YachtEquipment.findOne({
            where: { id: equipment.id },
            include: [
                { model: Yacht, as: 'yacht' },
                {
                    model: MaintenanceRuleAssignment,
                    as: 'ruleAssignments',
                    include: [{
                        model: MaintenanceRule,
                        as: 'rule',
                        include: [{
                            model: MaintenanceRuleMaterial,
                            as: 'recommendedMaterials',
                            include: [{ model: Product, as: 'product' }],
                        }],
                    }],
                },
                {
                    model: MaintenanceRecord,
                    as: 'records',
                    include: [
                        { model: MaintenanceRule, as: 'rule' },
                        {
                            model: MaintenanceRecordMaterial,
                            as: 'materials',
                            include: [{ model: Product, as: 'product' }],
                        },
                    ],
                },
            ],
        });

        expect(reloaded.yacht.id).toBe(yacht.id);
        expect(reloaded.ruleAssignments).toHaveLength(1);
        expect(reloaded.ruleAssignments[0].rule.name).toBe('Cambio de aceite');
        expect(reloaded.ruleAssignments[0].rule.recommendedMaterials[0].product.name).toBe('Aceite 15W40');
        expect(reloaded.records).toHaveLength(1);
        expect(reloaded.records[0].rule.name).toBe('Cambio de aceite');
        expect(reloaded.records[0].responsible).toBe('Juan Pérez');
        expect(reloaded.records[0].materials[0].product.name).toBe('Aceite 15W40');
    });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- tests/domain/catalogs-maintenance/models.test.js`
Expected: FAIL — `Cannot find module '../../../src/models/catalogs/yachtEquipment.models'`.

- [ ] **Step 3: Crear los 6 modelos**

`src/models/catalogs/yachtEquipment.models.js`:

```js
const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const YachtEquipment = db.define('yacht_equipment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'yacht_id',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    brand: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'marca',
    },
    model: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'modelo',
    },
    serialNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'numero_serie',
    },
    power: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'potencia',
    },
    rpm: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

module.exports = YachtEquipment;
```

`src/models/catalogs/maintenanceRule.models.js`:

```js
const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRule = db.define('maintenance_rule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    periodicityValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'periodicity_value',
    },
    periodicityUnit: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'periodicity_unit',
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

module.exports = MaintenanceRule;
```

`src/models/catalogs/maintenanceRuleAssignment.models.js`:

```js
const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRuleAssignment = db.define('maintenance_rule_assignment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    equipmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'equipment_id',
    },
    ruleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'rule_id',
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    indexes: [
        { unique: true, fields: ['equipment_id', 'rule_id'] },
    ],
});

module.exports = MaintenanceRuleAssignment;
```

`src/models/catalogs/maintenanceRuleMaterial.models.js`:

```js
const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRuleMaterial = db.define('maintenance_rule_material', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    ruleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'rule_id',
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
    },
    recommendedQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'recommended_quantity',
    },
});

module.exports = MaintenanceRuleMaterial;
```

`src/models/catalogs/maintenanceRecord.models.js`:

```js
const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRecord = db.define('maintenance_record', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    equipmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'equipment_id',
    },
    yachtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'yacht_id',
    },
    ruleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'rule_id',
    },
    responsible: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'responsable',
    },
    workPerformed: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'work_performed',
    },
    performedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'performed_at',
    },
    hoursReading: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'hours_reading',
    },
    observation: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    approvedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'approved_by',
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at',
    },
});

module.exports = MaintenanceRecord;
```

`src/models/catalogs/maintenanceRecordMaterial.models.js`:

```js
const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const MaintenanceRecordMaterial = db.define('maintenance_record_material', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    recordId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'record_id',
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

module.exports = MaintenanceRecordMaterial;
```

- [ ] **Step 4: Registrar los requires y associations en `src/models/init.models.js`**

Agrega estos requires junto a los demás (mismo lugar donde estaban los viejos, cerca de la línea 57):

```js
const YachtEquipment = require('./catalogs/yachtEquipment.models');
const MaintenanceRule = require('./catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('./catalogs/maintenanceRuleAssignment.models');
const MaintenanceRuleMaterial = require('./catalogs/maintenanceRuleMaterial.models');
const MaintenanceRecord = require('./catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('./catalogs/maintenanceRecordMaterial.models');
```

Agrega este bloque de associations dentro de `initModels()` (donde estaba el bloque viejo que se borró en Task 1):

```js
    YachtEquipment.belongsTo(Yacht, { as: 'yacht', foreignKey: 'yacht_id' });
    Yacht.hasMany(YachtEquipment, { as: 'equipment', foreignKey: 'yacht_id', onDelete: 'CASCADE', hooks: true });

    MaintenanceRuleAssignment.belongsTo(YachtEquipment, { as: 'equipment', foreignKey: 'equipment_id' });
    YachtEquipment.hasMany(MaintenanceRuleAssignment, { as: 'ruleAssignments', foreignKey: 'equipment_id', onDelete: 'CASCADE', hooks: true });

    MaintenanceRuleAssignment.belongsTo(MaintenanceRule, { as: 'rule', foreignKey: 'rule_id' });
    MaintenanceRule.hasMany(MaintenanceRuleAssignment, { as: 'assignments', foreignKey: 'rule_id', onDelete: 'CASCADE', hooks: true });

    MaintenanceRuleMaterial.belongsTo(MaintenanceRule, { as: 'rule', foreignKey: 'rule_id' });
    MaintenanceRule.hasMany(MaintenanceRuleMaterial, { as: 'recommendedMaterials', foreignKey: 'rule_id', onDelete: 'CASCADE', hooks: true });
    MaintenanceRuleMaterial.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });

    MaintenanceRecord.belongsTo(YachtEquipment, { as: 'equipment', foreignKey: 'equipment_id' });
    YachtEquipment.hasMany(MaintenanceRecord, { as: 'records', foreignKey: 'equipment_id' });
    MaintenanceRecord.belongsTo(Yacht, { as: 'yacht', foreignKey: 'yacht_id' });
    MaintenanceRecord.belongsTo(MaintenanceRule, { as: 'rule', foreignKey: 'rule_id' });
    MaintenanceRule.hasMany(MaintenanceRecord, { as: 'records', foreignKey: 'rule_id' });

    MaintenanceRecordMaterial.belongsTo(MaintenanceRecord, { as: 'record', foreignKey: 'record_id' });
    MaintenanceRecord.hasMany(MaintenanceRecordMaterial, { as: 'materials', foreignKey: 'record_id', onDelete: 'CASCADE', hooks: true });
    MaintenanceRecordMaterial.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });

```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- tests/domain/catalogs-maintenance/models.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/models/catalogs/yachtEquipment.models.js \
        src/models/catalogs/maintenanceRule.models.js \
        src/models/catalogs/maintenanceRuleAssignment.models.js \
        src/models/catalogs/maintenanceRuleMaterial.models.js \
        src/models/catalogs/maintenanceRecord.models.js \
        src/models/catalogs/maintenanceRecordMaterial.models.js \
        src/models/init.models.js \
        tests/domain/catalogs-maintenance/models.test.js
git commit -m "$(cat <<'EOF'
feat: add maintenance domain models and associations

Modelos nuevos desde cero (yacht_equipment, maintenance_rule,
maintenance_rule_assignment, maintenance_rule_material,
maintenance_record, maintenance_record_material) según el spec de
historial de mantenimiento.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019mMDQoNgeGbZhP6qnWPdit
EOF
)"
```

---

### Task 3: Endpoints de equipos (`/maintenance/equipment`)

**Files:**
- Create: `src/services/catalogs/maintenance.services.js`
- Create: `src/controllers/catalogs/maintenance.controller.js`
- Create: `src/routes/catalogs/maintenance.routes.js`
- Modify: `src/routes/index.js`
- Test: `tests/domain/catalogs-maintenance/equipment.test.js`

**Interfaces:**
- Consumes: `YachtEquipment` (Task 2).
- Produces (usado por Tasks 4-7, que agregan secciones a estos mismos 3 archivos): helpers de controller `decodeId(value, fieldName)`, `decodeOptionalId(value, fieldName)`, `encodeInstanceField(instance, field)`; `MaintenanceService.getEquipmentById(id)` (usado también por records/rule-assignments para validar que el equipo existe).

- [ ] **Step 1: Escribir el test de equipos (falla — no hay rutas montadas)**

Crea `tests/domain/catalogs-maintenance/equipment.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - equipment', () => {
    it('requires authentication', async () => {
        const response = await request(app).get('/api/maintenance/equipment');
        expect(response.status).toBe(403);
    });

    it('creates equipment and returns encoded identifiers on the list', async () => {
        const { yacht } = await createCompanyWithYacht('Equipment Co', 'Equipment Yacht');

        const created = await auth(
            request(app).post('/api/maintenance/equipment').send({
                yachtId: Utils.encode(yacht.id),
                name: 'Motor Babor',
                brand: 'Caterpillar',
            })
        );
        expect(created.status).toBe(200);
        expect(created.body.data).toBe('resource created successfully');

        const stored = await YachtEquipment.findOne({ where: { name: 'Motor Babor' } });
        expect(stored.brand).toBe('Caterpillar');
        expect(stored.yachtId).toBe(yacht.id);

        const list = await auth(request(app).get('/api/maintenance/equipment'));
        const found = list.body.find((item) => item.name === 'Motor Babor');
        expect(found.id).toBe(Utils.encode(stored.id));
        expect(found.yachtId).toBe(Utils.encode(yacht.id));
    });

    it('rejects creation without yachtId or name', async () => {
        const response = await auth(
            request(app).post('/api/maintenance/equipment').send({ name: 'Sin yate' })
        );
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('lists equipment filtered by yachtId', async () => {
        const { yacht: yachtA } = await createCompanyWithYacht('List Co A', 'List Yacht A');
        const { yacht: yachtB } = await createCompanyWithYacht('List Co B', 'List Yacht B');
        await YachtEquipment.create({ yachtId: yachtA.id, name: 'Generador A' });
        await YachtEquipment.create({ yachtId: yachtB.id, name: 'Generador B' });

        const response = await auth(
            request(app).get(`/api/maintenance/equipment?yachtId=${Utils.encode(yachtA.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.every((item) => item.yachtId === Utils.encode(yachtA.id))).toBe(true);
        expect(response.body.some((item) => item.name === 'Generador A')).toBe(true);
        expect(response.body.some((item) => item.name === 'Generador B')).toBe(false);
    });

    it('updates equipment and reports 404 for a missing one', async () => {
        const { yacht } = await createCompanyWithYacht('Update Co', 'Update Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Old Name' });

        const updated = await auth(
            request(app)
                .put(`/api/maintenance/equipment/${Utils.encode(equipment.id)}`)
                .send({ yachtId: Utils.encode(yacht.id), name: 'New Name' })
        );
        expect(updated.status).toBe(200);
        expect(updated.body.data).toBe('resource updated successfully');
        const stored = await YachtEquipment.findByPk(equipment.id);
        expect(stored.name).toBe('New Name');

        const missing = await auth(
            request(app)
                .put(`/api/maintenance/equipment/${Utils.encode(999999999)}`)
                .send({ yachtId: Utils.encode(yacht.id), name: 'Ghost' })
        );
        expect(missing.status).toBe(404);
    });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- tests/domain/catalogs-maintenance/equipment.test.js`
Expected: FAIL — `Cannot find module '.../src/services/catalogs/maintenance.services'` (o 404 en las rutas si se llega a bootear).

- [ ] **Step 3: Crear el service**

`src/services/catalogs/maintenance.services.js`:

```js
const db = require('../../utils/database');
const YachtEquipment = require('../../models/catalogs/yachtEquipment.models');

class MaintenanceService {
    // EQUIPMENT
    static async getAllEquipment(yachtId) {
        const where = {};
        if (yachtId) where.yachtId = yachtId;
        return YachtEquipment.findAll({ where, order: [['name', 'ASC']] });
    }

    static async getEquipmentById(id) {
        return YachtEquipment.findByPk(id);
    }

    static async createEquipment(data) {
        return YachtEquipment.create(data);
    }

    static async updateEquipment(id, data) {
        const equipment = await YachtEquipment.findByPk(id);
        await equipment.update(data);
        return equipment;
    }
}

module.exports = MaintenanceService;
```

- [ ] **Step 4: Crear el controller**

`src/controllers/catalogs/maintenance.controller.js`:

```js
const MaintenanceService = require('../../services/catalogs/maintenance.services');
const AppError = require('../../errors/AppError');
const Utils = require('../../utils/Utils');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const decodeOptionalId = (value, fieldName) => {
    if (!value || value === 'undefined' || value === 'null') {
        return undefined;
    }
    return decodeId(value, fieldName);
};

const encodeInstanceField = (instance, field) => {
    if (instance?.dataValues?.[field] !== undefined && instance.dataValues[field] !== null) {
        instance.dataValues[field] = Utils.encode(instance.dataValues[field]);
    }
};

// EQUIPMENT

const validateEquipmentPayload = (body) => {
    const { yachtId, name } = body;
    if (!yachtId || typeof name !== 'string' || !name.trim()) {
        throw new AppError('yachtId y name son obligatorios', 400);
    }
};

const getAllEquipment = async (req, res, next) => {
    try {
        const yachtId = decodeOptionalId(req.query.yachtId, 'ID de yate');
        const result = await MaintenanceService.getAllEquipment(yachtId);
        result.forEach((equipment) => {
            encodeInstanceField(equipment, 'id');
            encodeInstanceField(equipment, 'yachtId');
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createEquipment = async (req, res, next) => {
    try {
        validateEquipmentPayload(req.body);
        const { yachtId, name, brand, model, serialNumber, power, rpm } = req.body;
        await MaintenanceService.createEquipment({
            yachtId: decodeId(yachtId, 'ID de yate'),
            name,
            brand: brand ?? null,
            model: model ?? null,
            serialNumber: serialNumber ?? null,
            power: power ?? null,
            rpm: rpm ?? null,
        });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateEquipment = async (req, res, next) => {
    try {
        const equipmentId = decodeId(req.params.equipment_id, 'ID de equipo');
        const existing = await MaintenanceService.getEquipmentById(equipmentId);
        if (!existing) {
            throw new AppError('Equipo no encontrado', 404);
        }
        validateEquipmentPayload(req.body);
        const { yachtId, name, brand, model, serialNumber, power, rpm, active } = req.body;
        await MaintenanceService.updateEquipment(equipmentId, {
            yachtId: decodeId(yachtId, 'ID de yate'),
            name,
            brand: brand ?? null,
            model: model ?? null,
            serialNumber: serialNumber ?? null,
            power: power ?? null,
            rpm: rpm ?? null,
            active: active !== undefined ? active : true,
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const MaintenanceController = {
    getAllEquipment,
    createEquipment,
    updateEquipment,
};
module.exports = MaintenanceController;
```

- [ ] **Step 5: Crear las rutas**

`src/routes/catalogs/maintenance.routes.js`:

```js
const { Router } = require('express');
const MaintenanceController = require('../../controllers/catalogs/maintenance.controller');

const router = Router();

// EQUIPMENT

/**
 * @openapi
 * /maintenance/equipment:
 *   get:
 *     summary: Listar equipos de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yachtId
 *         schema:
 *           type: string
 *         description: ID codificado del yate para filtrar
 *     responses:
 *       200:
 *         description: Lista de equipos
 *       400:
 *         description: yachtId inválido
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/equipment', MaintenanceController.getAllEquipment);

/**
 * @openapi
 * /maintenance/equipment:
 *   post:
 *     summary: Crear un equipo de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [yachtId, name]
 *             properties:
 *               yachtId:
 *                 type: string
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               power:
 *                 type: string
 *               rpm:
 *                 type: string
 *     responses:
 *       200:
 *         description: Equipo creado
 *       400:
 *         description: Payload inválido
 *       500:
 *         description: Error inesperado
 */
router.post('/equipment', MaintenanceController.createEquipment);

/**
 * @openapi
 * /maintenance/equipment/{equipment_id}:
 *   put:
 *     summary: Actualizar un equipo de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: equipment_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del equipo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [yachtId, name]
 *             properties:
 *               yachtId:
 *                 type: string
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               power:
 *                 type: string
 *               rpm:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Equipo actualizado
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error inesperado
 */
router.put('/equipment/:equipment_id', MaintenanceController.updateEquipment);

module.exports = router;
```

- [ ] **Step 6: Montar el router en `src/routes/index.js`**

Agrega junto a los demás requires:

```js
const maintenanceRoutes = require("./catalogs/maintenance.routes");
```

Y dentro de `routerApi`:

```js
  app.use("/api/maintenance", authJwt.verifyToken, maintenanceRoutes);
```

- [ ] **Step 7: Correr el test y verificar que pasa**

Run: `npm test -- tests/domain/catalogs-maintenance`
Expected: PASS (equipment.test.js y models.test.js).

- [ ] **Step 8: Commit**

```bash
git add src/services/catalogs/maintenance.services.js \
        src/controllers/catalogs/maintenance.controller.js \
        src/routes/catalogs/maintenance.routes.js \
        src/routes/index.js \
        tests/domain/catalogs-maintenance/equipment.test.js
git commit -m "$(cat <<'EOF'
feat: add maintenance equipment endpoints

GET/POST /maintenance/equipment y PUT /maintenance/equipment/:id, con
AppError + errorHandler centralizado y documentación @openapi.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019mMDQoNgeGbZhP6qnWPdit
EOF
)"
```

---

### Task 4: Endpoints de reglas y materiales recomendados (`/maintenance/rules`)

**Files:**
- Modify: `src/services/catalogs/maintenance.services.js`
- Modify: `src/controllers/catalogs/maintenance.controller.js`
- Modify: `src/routes/catalogs/maintenance.routes.js`
- Test: `tests/domain/catalogs-maintenance/rules.test.js`

**Interfaces:**
- Consumes: `MaintenanceRule`, `MaintenanceRuleMaterial`, `Product` (Task 2 / catálogo existente); `decodeId`/`decodeOptionalId`/`encodeInstanceField` (Task 3).
- Produces (usado por Task 5 y Task 6): `MaintenanceService.getRuleById(id)` — devuelve la regla con `recommendedMaterials` incluido, o `null`.

- [ ] **Step 1: Escribir el test de reglas (falla — no hay rutas de rules)**

Crea `tests/domain/catalogs-maintenance/rules.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - rules', () => {
    it('creates a rule with recommended materials and lists it with those materials', async () => {
        const product = await Product.create({ name: 'Aceite 15W40', type: 'CONSUMABLE' });

        const created = await auth(
            request(app).post('/api/maintenance/rules').send({
                name: 'Cambio de aceite',
                periodicityValue: 250,
                periodicityUnit: 'horas',
                instructions: 'Usar aceite 15W40',
                recommendedMaterials: [{ productId: Utils.encode(product.id), recommendedQuantity: 20 }],
            })
        );
        expect(created.status).toBe(200);
        expect(created.body.data).toBe('resource created successfully');

        const stored = await MaintenanceRule.findOne({ where: { name: 'Cambio de aceite' } });
        expect(stored.periodicityValue).toBe(250);

        const list = await auth(request(app).get('/api/maintenance/rules'));
        const found = list.body.find((item) => item.name === 'Cambio de aceite');
        expect(found.periodicityUnit).toBe('horas');
        expect(found.recommendedMaterials).toHaveLength(1);
        expect(found.recommendedMaterials[0].product.name).toBe('Aceite 15W40');
        expect(found.recommendedMaterials[0].product.id).toBe(Utils.encode(product.id));
    });

    it('rejects an invalid periodicityUnit', async () => {
        const response = await auth(
            request(app).post('/api/maintenance/rules').send({
                name: 'Regla inválida',
                periodicityUnit: 'semanas',
            })
        );
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('updates a rule, replacing its recommended materials, and 404s on a missing one', async () => {
        const productA = await Product.create({ name: 'Filtro A', type: 'DISCRETE' });
        const productB = await Product.create({ name: 'Filtro B', type: 'DISCRETE' });
        const rule = await MaintenanceRule.create({ name: 'Cambio de filtro' });

        const updated = await auth(
            request(app).put(`/api/maintenance/rules/${Utils.encode(rule.id)}`).send({
                name: 'Cambio de filtro actualizado',
                recommendedMaterials: [{ productId: Utils.encode(productB.id), recommendedQuantity: 1 }],
            })
        );
        expect(updated.status).toBe(200);
        expect(updated.body.data).toBe('resource updated successfully');

        const list = await auth(request(app).get('/api/maintenance/rules'));
        const found = list.body.find((item) => item.id === Utils.encode(rule.id));
        expect(found.name).toBe('Cambio de filtro actualizado');
        expect(found.recommendedMaterials).toHaveLength(1);
        expect(found.recommendedMaterials[0].product.name).toBe('Filtro B');

        const missing = await auth(
            request(app).put(`/api/maintenance/rules/${Utils.encode(999999999)}`).send({ name: 'Ghost' })
        );
        expect(missing.status).toBe(404);
    });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- tests/domain/catalogs-maintenance/rules.test.js`
Expected: FAIL — 404 en `POST /api/maintenance/rules` (ruta no existe).

- [ ] **Step 3: Agregar los métodos de rules al service**

Agrega en `src/services/catalogs/maintenance.services.js`, dentro de la clase `MaintenanceService` (después de los métodos de equipment) — y agrega los 3 requires que faltan arriba del archivo:

```js
const MaintenanceRule = require('../../models/catalogs/maintenanceRule.models');
const MaintenanceRuleMaterial = require('../../models/catalogs/maintenanceRuleMaterial.models');
const Product = require('../../models/operations/inventory/product.models');
```

```js
    // RULES
    static async getAllRules() {
        return MaintenanceRule.findAll({
            order: [['name', 'ASC']],
            include: [{
                model: MaintenanceRuleMaterial,
                as: 'recommendedMaterials',
                include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
            }],
        });
    }

    static async getRuleById(id) {
        return MaintenanceRule.findOne({
            where: { id },
            include: [{
                model: MaintenanceRuleMaterial,
                as: 'recommendedMaterials',
                include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
            }],
        });
    }

    static async createRule(data) {
        const transaction = await db.transaction();
        try {
            const rule = await MaintenanceRule.create({
                name: data.name,
                periodicityValue: data.periodicityValue,
                periodicityUnit: data.periodicityUnit,
                instructions: data.instructions,
            }, { transaction });

            if (data.recommendedMaterials.length) {
                const materials = data.recommendedMaterials.map((m) => ({
                    ruleId: rule.id,
                    productId: m.productId,
                    recommendedQuantity: m.recommendedQuantity,
                }));
                await MaintenanceRuleMaterial.bulkCreate(materials, { transaction });
            }

            await transaction.commit();
            return MaintenanceService.getRuleById(rule.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateRule(id, data) {
        const transaction = await db.transaction();
        try {
            const rule = await MaintenanceRule.findByPk(id, { transaction });
            await rule.update({
                name: data.name,
                periodicityValue: data.periodicityValue,
                periodicityUnit: data.periodicityUnit,
                instructions: data.instructions,
                active: data.active,
            }, { transaction });

            await MaintenanceRuleMaterial.destroy({ where: { ruleId: id }, transaction });
            if (data.recommendedMaterials.length) {
                const materials = data.recommendedMaterials.map((m) => ({
                    ruleId: id,
                    productId: m.productId,
                    recommendedQuantity: m.recommendedQuantity,
                }));
                await MaintenanceRuleMaterial.bulkCreate(materials, { transaction });
            }

            await transaction.commit();
            return MaintenanceService.getRuleById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
```

- [ ] **Step 4: Agregar los handlers de rules al controller**

Agrega en `src/controllers/catalogs/maintenance.controller.js`, después de la sección EQUIPMENT:

```js
// RULES

const PERIODICITY_UNITS = ['horas', 'dias', 'meses', 'anios'];

const validateRecommendedMaterials = (materials) => {
    if (materials === undefined) return;
    if (!Array.isArray(materials)) {
        throw new AppError('recommendedMaterials debe ser un array', 400);
    }
    materials.forEach((material) => {
        if (!material || !Number.isInteger(material.recommendedQuantity) || material.recommendedQuantity <= 0) {
            throw new AppError('Cada material recomendado debe incluir productId y recommendedQuantity > 0', 400);
        }
    });
};

const validatePeriodicityUnit = (unit) => {
    if (unit === undefined || unit === null) return;
    if (!PERIODICITY_UNITS.includes(unit)) {
        throw new AppError(`periodicityUnit debe ser uno de: ${PERIODICITY_UNITS.join(', ')}`, 400);
    }
};

const encodeRule = (rule) => {
    encodeInstanceField(rule, 'id');
    rule.dataValues.recommendedMaterials.forEach((material) => {
        encodeInstanceField(material, 'id');
        encodeInstanceField(material, 'ruleId');
        encodeInstanceField(material.dataValues.product, 'id');
    });
};

const getAllRules = async (req, res, next) => {
    try {
        const result = await MaintenanceService.getAllRules();
        result.forEach(encodeRule);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createRule = async (req, res, next) => {
    try {
        const { name, periodicityValue, periodicityUnit, instructions, recommendedMaterials } = req.body;
        if (typeof name !== 'string' || !name.trim()) {
            throw new AppError('name es obligatorio', 400);
        }
        validatePeriodicityUnit(periodicityUnit);
        validateRecommendedMaterials(recommendedMaterials);

        const decodedMaterials = (recommendedMaterials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            recommendedQuantity: m.recommendedQuantity,
        }));

        await MaintenanceService.createRule({
            name,
            periodicityValue: periodicityValue ?? null,
            periodicityUnit: periodicityUnit ?? null,
            instructions: instructions ?? null,
            recommendedMaterials: decodedMaterials,
        });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateRule = async (req, res, next) => {
    try {
        const ruleId = decodeId(req.params.rule_id, 'ID de regla');
        const existing = await MaintenanceService.getRuleById(ruleId);
        if (!existing) {
            throw new AppError('Regla no encontrada', 404);
        }

        const { name, periodicityValue, periodicityUnit, instructions, active, recommendedMaterials } = req.body;
        if (typeof name !== 'string' || !name.trim()) {
            throw new AppError('name es obligatorio', 400);
        }
        validatePeriodicityUnit(periodicityUnit);
        validateRecommendedMaterials(recommendedMaterials);

        const decodedMaterials = (recommendedMaterials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            recommendedQuantity: m.recommendedQuantity,
        }));

        await MaintenanceService.updateRule(ruleId, {
            name,
            periodicityValue: periodicityValue ?? null,
            periodicityUnit: periodicityUnit ?? null,
            instructions: instructions ?? null,
            active: active !== undefined ? active : true,
            recommendedMaterials: decodedMaterials,
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};
```

Y agrega `getAllRules, createRule, updateRule,` al objeto `MaintenanceController` exportado al final del archivo.

- [ ] **Step 5: Agregar las rutas de rules**

Agrega en `src/routes/catalogs/maintenance.routes.js`, antes de `module.exports = router;`:

```js
// RULES

/**
 * @openapi
 * /maintenance/rules:
 *   get:
 *     summary: Listar reglas de mantenimiento (catálogo informativo)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reglas con sus materiales recomendados
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/rules', MaintenanceController.getAllRules);

/**
 * @openapi
 * /maintenance/rules:
 *   post:
 *     summary: Crear una regla de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               periodicityValue:
 *                 type: number
 *                 nullable: true
 *               periodicityUnit:
 *                 type: string
 *                 enum: [horas, dias, meses, anios]
 *                 nullable: true
 *               instructions:
 *                 type: string
 *                 nullable: true
 *               recommendedMaterials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, recommendedQuantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     recommendedQuantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Regla creada
 *       400:
 *         description: Payload inválido
 *       500:
 *         description: Error inesperado
 */
router.post('/rules', MaintenanceController.createRule);

/**
 * @openapi
 * /maintenance/rules/{rule_id}:
 *   put:
 *     summary: Actualizar una regla de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rule_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la regla
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               periodicityValue:
 *                 type: number
 *                 nullable: true
 *               periodicityUnit:
 *                 type: string
 *                 enum: [horas, dias, meses, anios]
 *                 nullable: true
 *               instructions:
 *                 type: string
 *                 nullable: true
 *               active:
 *                 type: boolean
 *               recommendedMaterials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, recommendedQuantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     recommendedQuantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Regla actualizada
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Regla no encontrada
 *       500:
 *         description: Error inesperado
 */
router.put('/rules/:rule_id', MaintenanceController.updateRule);

```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npm test -- tests/domain/catalogs-maintenance`
Expected: PASS (equipment, models y rules).

- [ ] **Step 7: Commit**

```bash
git add src/services/catalogs/maintenance.services.js \
        src/controllers/catalogs/maintenance.controller.js \
        src/routes/catalogs/maintenance.routes.js \
        tests/domain/catalogs-maintenance/rules.test.js
git commit -m "$(cat <<'EOF'
feat: add maintenance rules catalog endpoints

GET/POST /maintenance/rules y PUT /maintenance/rules/:id, con
materiales recomendados ligados al catálogo real de Product.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019mMDQoNgeGbZhP6qnWPdit
EOF
)"
```

---

### Task 5: Asignación de reglas a equipos (`/maintenance/rule-assignments`)

**Files:**
- Modify: `src/services/catalogs/maintenance.services.js`
- Modify: `src/controllers/catalogs/maintenance.controller.js`
- Modify: `src/routes/catalogs/maintenance.routes.js`
- Test: `tests/domain/catalogs-maintenance/ruleAssignments.test.js`

**Interfaces:**
- Consumes: `MaintenanceService.getEquipmentById` (Task 3), `MaintenanceService.getRuleById` (Task 4), `MaintenanceRuleAssignment` (Task 2).
- Produces: nada consumido por tareas posteriores (Task 8 — el libro — consulta `ruleAssignments` directo vía association, no vía estos métodos).

- [ ] **Step 1: Escribir el test de asignaciones (falla — no hay rutas)**

Crea `tests/domain/catalogs-maintenance/ruleAssignments.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - rule assignments', () => {
    it('assigns a rule to an equipment and lists it under the equipment', async () => {
        const { yacht } = await createCompanyWithYacht('Assign Co', 'Assign Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Estribor' });
        const rule = await MaintenanceRule.create({ name: 'Cambio de aceite' });

        const created = await auth(
            request(app).post('/api/maintenance/rule-assignments').send({
                equipmentId: Utils.encode(equipment.id),
                ruleId: Utils.encode(rule.id),
            })
        );
        expect(created.status).toBe(200);
        expect(created.body.data).toBe('resource created successfully');

        const list = await auth(
            request(app).get(`/api/maintenance/equipment/${Utils.encode(equipment.id)}/rules`)
        );
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0].rule.name).toBe('Cambio de aceite');
        expect(list.body[0].active).toBe(true);
    });

    it('rejects a duplicate assignment', async () => {
        const { yacht } = await createCompanyWithYacht('Dup Co', 'Dup Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Generador' });
        const rule = await MaintenanceRule.create({ name: 'Revisión general' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });

        const response = await auth(
            request(app).post('/api/maintenance/rule-assignments').send({
                equipmentId: Utils.encode(equipment.id),
                ruleId: Utils.encode(rule.id),
            })
        );
        expect(response.status).toBe(409);
    });

    it('toggles an assignment active flag and 404s on a missing one', async () => {
        const { yacht } = await createCompanyWithYacht('Toggle Co', 'Toggle Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Winche' });
        const rule = await MaintenanceRule.create({ name: 'Engrase' });
        const assignment = await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });

        const updated = await auth(
            request(app)
                .put(`/api/maintenance/rule-assignments/${Utils.encode(assignment.id)}`)
                .send({ active: false })
        );
        expect(updated.status).toBe(200);
        const stored = await MaintenanceRuleAssignment.findByPk(assignment.id);
        expect(stored.active).toBe(false);

        const missing = await auth(
            request(app)
                .put(`/api/maintenance/rule-assignments/${Utils.encode(999999999)}`)
                .send({ active: false })
        );
        expect(missing.status).toBe(404);
    });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- tests/domain/catalogs-maintenance/ruleAssignments.test.js`
Expected: FAIL — 404 en `POST /api/maintenance/rule-assignments`.

- [ ] **Step 3: Agregar los métodos al service**

Agrega en `src/services/catalogs/maintenance.services.js` (con `const MaintenanceRuleAssignment = require('../../models/catalogs/maintenanceRuleAssignment.models');` arriba junto a los otros requires):

```js
    // RULE ASSIGNMENTS
    static async getRuleAssignmentsByEquipment(equipmentId) {
        return MaintenanceRuleAssignment.findAll({
            where: { equipmentId },
            include: [{ model: MaintenanceRule, as: 'rule' }],
        });
    }

    static async getRuleAssignmentById(id) {
        return MaintenanceRuleAssignment.findByPk(id);
    }

    static async findRuleAssignment(equipmentId, ruleId) {
        return MaintenanceRuleAssignment.findOne({ where: { equipmentId, ruleId } });
    }

    static async createRuleAssignment(equipmentId, ruleId) {
        return MaintenanceRuleAssignment.create({ equipmentId, ruleId });
    }

    static async updateRuleAssignment(id, active) {
        const assignment = await MaintenanceRuleAssignment.findByPk(id);
        await assignment.update({ active });
        return assignment;
    }
```

- [ ] **Step 4: Agregar los handlers al controller**

Agrega en `src/controllers/catalogs/maintenance.controller.js`, después de la sección RULES:

```js
// RULE ASSIGNMENTS

const getEquipmentRules = async (req, res, next) => {
    try {
        const equipmentId = decodeId(req.params.equipment_id, 'ID de equipo');
        const equipment = await MaintenanceService.getEquipmentById(equipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }
        const result = await MaintenanceService.getRuleAssignmentsByEquipment(equipmentId);
        result.forEach((assignment) => {
            encodeInstanceField(assignment, 'id');
            encodeInstanceField(assignment, 'equipmentId');
            encodeInstanceField(assignment, 'ruleId');
            encodeInstanceField(assignment.dataValues.rule, 'id');
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createRuleAssignment = async (req, res, next) => {
    try {
        const { equipmentId, ruleId } = req.body;
        if (!equipmentId || !ruleId) {
            throw new AppError('equipmentId y ruleId son obligatorios', 400);
        }
        const decodedEquipmentId = decodeId(equipmentId, 'ID de equipo');
        const decodedRuleId = decodeId(ruleId, 'ID de regla');

        const equipment = await MaintenanceService.getEquipmentById(decodedEquipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }
        const rule = await MaintenanceService.getRuleById(decodedRuleId);
        if (!rule) {
            throw new AppError('Regla no encontrada', 404);
        }
        const existing = await MaintenanceService.findRuleAssignment(decodedEquipmentId, decodedRuleId);
        if (existing) {
            throw new AppError('Esta regla ya está asignada a este equipo', 409);
        }

        await MaintenanceService.createRuleAssignment(decodedEquipmentId, decodedRuleId);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateRuleAssignment = async (req, res, next) => {
    try {
        const assignmentId = decodeId(req.params.assignment_id, 'ID de asignación');
        const { active } = req.body;
        if (typeof active !== 'boolean') {
            throw new AppError('active es obligatorio y debe ser booleano', 400);
        }
        const existing = await MaintenanceService.getRuleAssignmentById(assignmentId);
        if (!existing) {
            throw new AppError('Asignación no encontrada', 404);
        }
        await MaintenanceService.updateRuleAssignment(assignmentId, active);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};
```

Y agrega `getEquipmentRules, createRuleAssignment, updateRuleAssignment,` al objeto `MaintenanceController` exportado.

- [ ] **Step 5: Agregar las rutas**

Agrega en `src/routes/catalogs/maintenance.routes.js`, antes de `module.exports = router;`:

```js
// RULE ASSIGNMENTS

/**
 * @openapi
 * /maintenance/equipment/{equipment_id}/rules:
 *   get:
 *     summary: Listar reglas asignadas a un equipo
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: equipment_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del equipo
 *     responses:
 *       200:
 *         description: Lista de asignaciones con su regla
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error inesperado
 */
router.get('/equipment/:equipment_id/rules', MaintenanceController.getEquipmentRules);

/**
 * @openapi
 * /maintenance/rule-assignments:
 *   post:
 *     summary: Asignar una regla de mantenimiento a un equipo
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, ruleId]
 *             properties:
 *               equipmentId:
 *                 type: string
 *               ruleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asignación creada
 *       400:
 *         description: Payload inválido
 *       404:
 *         description: Equipo o regla no encontrados
 *       409:
 *         description: La regla ya está asignada a este equipo
 *       500:
 *         description: Error inesperado
 */
router.post('/rule-assignments', MaintenanceController.createRuleAssignment);

/**
 * @openapi
 * /maintenance/rule-assignments/{assignment_id}:
 *   put:
 *     summary: Activar/desactivar una asignación de regla
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignment_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la asignación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [active]
 *             properties:
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Asignación actualizada
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error inesperado
 */
router.put('/rule-assignments/:assignment_id', MaintenanceController.updateRuleAssignment);

```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npm test -- tests/domain/catalogs-maintenance`
Expected: PASS (equipment, models, rules, ruleAssignments).

- [ ] **Step 7: Commit**

```bash
git add src/services/catalogs/maintenance.services.js \
        src/controllers/catalogs/maintenance.controller.js \
        src/routes/catalogs/maintenance.routes.js \
        tests/domain/catalogs-maintenance/ruleAssignments.test.js
git commit -m "$(cat <<'EOF'
feat: add maintenance rule assignment endpoints

Asigna reglas de mantenimiento a equipos y permite activar/desactivarlas,
con validación de duplicados.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019mMDQoNgeGbZhP6qnWPdit
EOF
)"
```

---

### Task 6: Historial — endpoints de records (`/maintenance/records`, incluye aprobación)

**Files:**
- Modify: `src/services/catalogs/maintenance.services.js`
- Modify: `src/controllers/catalogs/maintenance.controller.js`
- Modify: `src/routes/catalogs/maintenance.routes.js`
- Test: `tests/domain/catalogs-maintenance/records.test.js`

**Interfaces:**
- Consumes: `MaintenanceService.getEquipmentById` (Task 3), `MaintenanceService.getRuleById` (Task 4), `MaintenanceRecord`/`MaintenanceRecordMaterial` (Task 2).
- Produces (usado por Task 7 — el libro): `MaintenanceRecord`/`MaintenanceRecordMaterial` ya están disponibles desde Task 2; el libro no llama a estos métodos de service, arma su propia query.

- [ ] **Step 1: Escribir el test de records (falla — no hay rutas)**

Crea `tests/domain/catalogs-maintenance/records.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - records (historial)', () => {
    it('creates a corrective record without a rule, and it appears in the yacht history', async () => {
        const { yacht } = await createCompanyWithYacht('Records Co', 'Records Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Bomba de achique' });
        const product = await Product.create({ name: 'Manguera', type: 'DISCRETE' });

        const created = await auth(
            request(app).post('/api/maintenance/records').send({
                equipmentId: Utils.encode(equipment.id),
                responsible: 'Carlos Mecánico',
                workPerformed: 'Cambio de manguera de succión',
                performedAt: '2026-09-01T10:00:00.000Z',
                hoursReading: 1200,
                materials: [{ productId: Utils.encode(product.id), quantity: 2 }],
            })
        );
        expect(created.status).toBe(200);
        expect(created.body.data).toBe('resource created successfully');

        const stored = await MaintenanceRecord.findOne({ where: { responsible: 'Carlos Mecánico' } });
        expect(stored.ruleId).toBeNull();
        expect(stored.yachtId).toBe(yacht.id);

        const list = await auth(
            request(app).get(`/api/maintenance/records?yachtId=${Utils.encode(yacht.id)}`)
        );
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0].workPerformed).toBe('Cambio de manguera de succión');
        expect(list.body[0].materials[0].product.name).toBe('Manguera');
        expect(list.body[0].materials[0].quantity).toBe(2);
        expect(list.body[0].rule).toBeNull();
    });

    it('creates a record tied to a rule', async () => {
        const { yacht } = await createCompanyWithYacht('Records Rule Co', 'Records Rule Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });
        const rule = await MaintenanceRule.create({ name: 'Cambio de aceite' });

        const created = await auth(
            request(app).post('/api/maintenance/records').send({
                equipmentId: Utils.encode(equipment.id),
                ruleId: Utils.encode(rule.id),
                responsible: 'Pedro',
                workPerformed: 'Cambio de aceite',
                performedAt: '2026-09-02T08:00:00.000Z',
            })
        );
        expect(created.status).toBe(200);

        const stored = await MaintenanceRecord.findOne({ where: { responsible: 'Pedro' } });
        expect(stored.ruleId).toBe(rule.id);
    });

    it('filters the history correctly across multiple yachts', async () => {
        const { yacht: yachtA } = await createCompanyWithYacht('Records Filter Co A', 'Records Filter Yacht A');
        const { yacht: yachtB } = await createCompanyWithYacht('Records Filter Co B', 'Records Filter Yacht B');
        const equipmentA = await YachtEquipment.create({ yachtId: yachtA.id, name: 'Motor A' });
        const equipmentB = await YachtEquipment.create({ yachtId: yachtB.id, name: 'Motor B' });
        await MaintenanceRecord.create({
            equipmentId: equipmentA.id, yachtId: yachtA.id,
            responsible: 'Responsable A', workPerformed: 'Trabajo A',
            performedAt: new Date('2026-09-01T00:00:00.000Z'),
        });
        await MaintenanceRecord.create({
            equipmentId: equipmentB.id, yachtId: yachtB.id,
            responsible: 'Responsable B', workPerformed: 'Trabajo B',
            performedAt: new Date('2026-09-01T00:00:00.000Z'),
        });

        const response = await auth(
            request(app).get(`/api/maintenance/records?yachtId=${Utils.encode(yachtA.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.every((item) => item.yachtId === Utils.encode(yachtA.id))).toBe(true);
        expect(response.body.some((item) => item.workPerformed === 'Trabajo A')).toBe(true);
        expect(response.body.some((item) => item.workPerformed === 'Trabajo B')).toBe(false);
    });

    it('rejects creation without equipmentId, responsible, workPerformed or a valid performedAt', async () => {
        const { yacht } = await createCompanyWithYacht('Records Invalid Co', 'Records Invalid Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });

        const response = await auth(
            request(app).post('/api/maintenance/records').send({
                equipmentId: Utils.encode(equipment.id),
                responsible: 'Pedro',
                workPerformed: 'Algo',
                performedAt: 'not-a-date',
            })
        );
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('allows editing a record while not approved, and blocks it once approved', async () => {
        const { yacht } = await createCompanyWithYacht('Records Edit Co', 'Records Edit Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });
        const record = await MaintenanceRecord.create({
            equipmentId: equipment.id,
            yachtId: yacht.id,
            responsible: 'Original',
            workPerformed: 'Trabajo original',
            performedAt: new Date('2026-09-01T00:00:00.000Z'),
        });

        const updated = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}`).send({
                equipmentId: Utils.encode(equipment.id),
                responsible: 'Corregido',
                workPerformed: 'Trabajo corregido',
                performedAt: '2026-09-01T00:00:00.000Z',
            })
        );
        expect(updated.status).toBe(200);
        expect(updated.body.data).toBe('resource updated successfully');
        expect((await MaintenanceRecord.findByPk(record.id)).responsible).toBe('Corregido');

        const approved = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`).send({
                approvedBy: 'Jefe de Mantenimiento',
            })
        );
        expect(approved.status).toBe(200);
        expect(approved.body.data).toBe('resource approved successfully');

        const blocked = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}`).send({
                equipmentId: Utils.encode(equipment.id),
                responsible: 'No debería pasar',
                workPerformed: 'No debería pasar',
                performedAt: '2026-09-01T00:00:00.000Z',
            })
        );
        expect(blocked.status).toBe(409);

        const reapproved = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`).send({
                approvedBy: 'Otro',
            })
        );
        expect(reapproved.status).toBe(409);
    });

    it('rejects approval without approvedBy', async () => {
        const { yacht } = await createCompanyWithYacht('Records Approve Co', 'Records Approve Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor' });
        const record = await MaintenanceRecord.create({
            equipmentId: equipment.id,
            yachtId: yacht.id,
            responsible: 'X',
            workPerformed: 'Y',
            performedAt: new Date('2026-09-01T00:00:00.000Z'),
        });

        const response = await auth(
            request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`).send({})
        );
        expect(response.status).toBe(400);
    });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- tests/domain/catalogs-maintenance/records.test.js`
Expected: FAIL — 404 en `POST /api/maintenance/records`.

- [ ] **Step 3: Agregar los métodos al service**

Agrega en `src/services/catalogs/maintenance.services.js` (con `const { Op } = require('sequelize');`, `const MaintenanceRecord = require('../../models/catalogs/maintenanceRecord.models');` y `const MaintenanceRecordMaterial = require('../../models/catalogs/maintenanceRecordMaterial.models');` arriba junto a los demás requires):

```js
    // RECORDS (historial)
    static async getAllRecords(filters) {
        const where = {};
        if (filters.yachtId) where.yachtId = filters.yachtId;
        if (filters.equipmentId) where.equipmentId = filters.equipmentId;
        if (filters.ruleId) where.ruleId = filters.ruleId;
        if (filters.from || filters.to) {
            where.performedAt = {};
            if (filters.from) where.performedAt[Op.gte] = filters.from;
            if (filters.to) where.performedAt[Op.lte] = filters.to;
        }
        return MaintenanceRecord.findAll({
            where,
            order: [['performedAt', 'DESC']],
            include: [
                { model: YachtEquipment, as: 'equipment', attributes: ['id', 'name'] },
                { model: MaintenanceRule, as: 'rule', attributes: ['id', 'name'] },
                {
                    model: MaintenanceRecordMaterial,
                    as: 'materials',
                    include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
                },
            ],
        });
    }

    static async getRecordById(id) {
        return MaintenanceRecord.findOne({
            where: { id },
            include: [
                { model: YachtEquipment, as: 'equipment', attributes: ['id', 'name'] },
                { model: MaintenanceRule, as: 'rule', attributes: ['id', 'name'] },
                {
                    model: MaintenanceRecordMaterial,
                    as: 'materials',
                    include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
                },
            ],
        });
    }

    static async createRecord(data) {
        const transaction = await db.transaction();
        try {
            const record = await MaintenanceRecord.create({
                equipmentId: data.equipmentId,
                yachtId: data.yachtId,
                ruleId: data.ruleId,
                responsible: data.responsible,
                workPerformed: data.workPerformed,
                performedAt: data.performedAt,
                hoursReading: data.hoursReading,
                observation: data.observation,
            }, { transaction });

            if (data.materials.length) {
                const materials = data.materials.map((m) => ({
                    recordId: record.id,
                    productId: m.productId,
                    quantity: m.quantity,
                }));
                await MaintenanceRecordMaterial.bulkCreate(materials, { transaction });
            }

            await transaction.commit();
            return MaintenanceService.getRecordById(record.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateRecord(id, data) {
        const transaction = await db.transaction();
        try {
            const record = await MaintenanceRecord.findByPk(id, { transaction });
            await record.update({
                equipmentId: data.equipmentId,
                yachtId: data.yachtId,
                ruleId: data.ruleId,
                responsible: data.responsible,
                workPerformed: data.workPerformed,
                performedAt: data.performedAt,
                hoursReading: data.hoursReading,
                observation: data.observation,
            }, { transaction });

            await MaintenanceRecordMaterial.destroy({ where: { recordId: id }, transaction });
            if (data.materials.length) {
                const materials = data.materials.map((m) => ({
                    recordId: id,
                    productId: m.productId,
                    quantity: m.quantity,
                }));
                await MaintenanceRecordMaterial.bulkCreate(materials, { transaction });
            }

            await transaction.commit();
            return MaintenanceService.getRecordById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async approveRecord(id, approvedBy) {
        await MaintenanceRecord.update(
            { approvedBy, approvedAt: new Date() },
            { where: { id } }
        );
        return MaintenanceService.getRecordById(id);
    }
```

- [ ] **Step 4: Agregar los handlers al controller**

Agrega en `src/controllers/catalogs/maintenance.controller.js`, después de la sección RULE ASSIGNMENTS:

```js
// RECORDS (historial)

const requireValidDate = (value, fieldName) => {
    if (!value || Number.isNaN(new Date(value).getTime())) {
        throw new AppError(`${fieldName} inválida`, 400);
    }
    return new Date(value);
};

const validateMaterials = (materials) => {
    if (materials === undefined) return;
    if (!Array.isArray(materials)) {
        throw new AppError('materials debe ser un array', 400);
    }
    materials.forEach((material) => {
        if (!material || !Number.isInteger(material.quantity) || material.quantity <= 0) {
            throw new AppError('Cada material debe incluir productId y quantity > 0', 400);
        }
    });
};

const encodeRecord = (record) => {
    encodeInstanceField(record, 'id');
    encodeInstanceField(record, 'equipmentId');
    encodeInstanceField(record, 'yachtId');
    if (record.dataValues.ruleId) {
        encodeInstanceField(record, 'ruleId');
    }
    encodeInstanceField(record.dataValues.equipment, 'id');
    if (record.dataValues.rule) {
        encodeInstanceField(record.dataValues.rule, 'id');
    }
    record.dataValues.materials.forEach((material) => {
        encodeInstanceField(material, 'id');
        encodeInstanceField(material, 'recordId');
        encodeInstanceField(material.dataValues.product, 'id');
    });
};

const validateRecordPayload = (body) => {
    const { equipmentId, responsible, workPerformed, performedAt } = body;
    if (!equipmentId || typeof responsible !== 'string' || !responsible.trim()
        || typeof workPerformed !== 'string' || !workPerformed.trim()) {
        throw new AppError('equipmentId, responsible y workPerformed son obligatorios', 400);
    }
    requireValidDate(performedAt, 'performedAt');
    validateMaterials(body.materials);
};

const getAllRecords = async (req, res, next) => {
    try {
        const filters = {
            yachtId: decodeOptionalId(req.query.yachtId, 'ID de yate'),
            equipmentId: decodeOptionalId(req.query.equipmentId, 'ID de equipo'),
            ruleId: decodeOptionalId(req.query.ruleId, 'ID de regla'),
            from: req.query.from ? requireValidDate(req.query.from, 'from') : undefined,
            to: req.query.to ? requireValidDate(req.query.to, 'to') : undefined,
        };
        const result = await MaintenanceService.getAllRecords(filters);
        result.forEach(encodeRecord);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getRecord = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        const result = await MaintenanceService.getRecordById(recordId);
        if (!result) {
            throw new AppError('Registro no encontrado', 404);
        }
        encodeRecord(result);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createRecord = async (req, res, next) => {
    try {
        validateRecordPayload(req.body);
        const { equipmentId, ruleId, responsible, workPerformed, performedAt, hoursReading, observation, materials } = req.body;

        const decodedEquipmentId = decodeId(equipmentId, 'ID de equipo');
        const equipment = await MaintenanceService.getEquipmentById(decodedEquipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }

        const decodedRuleId = decodeOptionalId(ruleId, 'ID de regla');
        if (decodedRuleId) {
            const rule = await MaintenanceService.getRuleById(decodedRuleId);
            if (!rule || !rule.active) {
                throw new AppError('Regla de mantenimiento no encontrada o inactiva', 400);
            }
        }

        const decodedMaterials = (materials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            quantity: m.quantity,
        }));

        await MaintenanceService.createRecord({
            equipmentId: decodedEquipmentId,
            yachtId: equipment.yachtId,
            ruleId: decodedRuleId || null,
            responsible,
            workPerformed,
            performedAt: new Date(performedAt),
            hoursReading: hoursReading ?? null,
            observation: observation ?? null,
            materials: decodedMaterials,
        });

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateRecord = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        const existing = await MaintenanceService.getRecordById(recordId);
        if (!existing) {
            throw new AppError('Registro no encontrado', 404);
        }
        if (existing.approvedAt) {
            throw new AppError('No se puede editar un registro ya aprobado', 409);
        }

        validateRecordPayload(req.body);
        const { equipmentId, ruleId, responsible, workPerformed, performedAt, hoursReading, observation, materials } = req.body;

        const decodedEquipmentId = decodeId(equipmentId, 'ID de equipo');
        const equipment = await MaintenanceService.getEquipmentById(decodedEquipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }

        const decodedRuleId = decodeOptionalId(ruleId, 'ID de regla');
        if (decodedRuleId) {
            const rule = await MaintenanceService.getRuleById(decodedRuleId);
            if (!rule || !rule.active) {
                throw new AppError('Regla de mantenimiento no encontrada o inactiva', 400);
            }
        }

        const decodedMaterials = (materials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            quantity: m.quantity,
        }));

        await MaintenanceService.updateRecord(recordId, {
            equipmentId: decodedEquipmentId,
            yachtId: equipment.yachtId,
            ruleId: decodedRuleId || null,
            responsible,
            workPerformed,
            performedAt: new Date(performedAt),
            hoursReading: hoursReading ?? null,
            observation: observation ?? null,
            materials: decodedMaterials,
        });

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const approveRecord = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        const { approvedBy } = req.body;
        if (typeof approvedBy !== 'string' || !approvedBy.trim()) {
            throw new AppError('approvedBy es obligatorio', 400);
        }

        const existing = await MaintenanceService.getRecordById(recordId);
        if (!existing) {
            throw new AppError('Registro no encontrado', 404);
        }
        if (existing.approvedAt) {
            throw new AppError('Registro ya aprobado', 409);
        }

        await MaintenanceService.approveRecord(recordId, approvedBy);
        res.status(200).json({ data: 'resource approved successfully' });
    } catch (error) {
        next(error);
    }
};
```

Y agrega `getAllRecords, getRecord, createRecord, updateRecord, approveRecord,` al objeto `MaintenanceController` exportado.

- [ ] **Step 5: Agregar las rutas**

Agrega en `src/routes/catalogs/maintenance.routes.js`, antes de `module.exports = router;`:

```js
// RECORDS (historial)

/**
 * @openapi
 * /maintenance/records:
 *   get:
 *     summary: Listar el historial de mantenimiento (filtrable)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yachtId
 *         schema:
 *           type: string
 *       - in: query
 *         name: equipmentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: ruleId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Historial de mantenimiento, ordenado por performedAt descendente
 *       400:
 *         description: Algún filtro es inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/records', MaintenanceController.getAllRecords);

/**
 * @openapi
 * /maintenance/records/{record_id}:
 *   get:
 *     summary: Obtener un registro del historial
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registro de historial
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Registro no encontrado
 *       500:
 *         description: Error inesperado
 */
router.get('/records/:record_id', MaintenanceController.getRecord);

/**
 * @openapi
 * /maintenance/records:
 *   post:
 *     summary: Registrar un mantenimiento realizado
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, responsible, workPerformed, performedAt]
 *             properties:
 *               equipmentId:
 *                 type: string
 *               ruleId:
 *                 type: string
 *                 nullable: true
 *               responsible:
 *                 type: string
 *               workPerformed:
 *                 type: string
 *               performedAt:
 *                 type: string
 *                 format: date-time
 *               hoursReading:
 *                 type: number
 *                 nullable: true
 *               observation:
 *                 type: string
 *                 nullable: true
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Registro creado
 *       400:
 *         description: Payload inválido
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error inesperado
 */
router.post('/records', MaintenanceController.createRecord);

/**
 * @openapi
 * /maintenance/records/{record_id}:
 *   put:
 *     summary: Editar un registro del historial (solo si no está aprobado)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, responsible, workPerformed, performedAt]
 *             properties:
 *               equipmentId:
 *                 type: string
 *               ruleId:
 *                 type: string
 *                 nullable: true
 *               responsible:
 *                 type: string
 *               workPerformed:
 *                 type: string
 *               performedAt:
 *                 type: string
 *                 format: date-time
 *               hoursReading:
 *                 type: number
 *                 nullable: true
 *               observation:
 *                 type: string
 *                 nullable: true
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Registro actualizado
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Registro o equipo no encontrado
 *       409:
 *         description: El registro ya fue aprobado y es inmutable
 *       500:
 *         description: Error inesperado
 */
router.put('/records/:record_id', MaintenanceController.updateRecord);

/**
 * @openapi
 * /maintenance/records/{record_id}/approve:
 *   put:
 *     summary: Aprobar un registro del historial
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [approvedBy]
 *             properties:
 *               approvedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registro aprobado
 *       400:
 *         description: approvedBy faltante o ID inválido
 *       404:
 *         description: Registro no encontrado
 *       409:
 *         description: El registro ya estaba aprobado
 *       500:
 *         description: Error inesperado
 */
router.put('/records/:record_id/approve', MaintenanceController.approveRecord);

```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npm test -- tests/domain/catalogs-maintenance`
Expected: PASS (equipment, models, rules, ruleAssignments, records).

- [ ] **Step 7: Commit**

```bash
git add src/services/catalogs/maintenance.services.js \
        src/controllers/catalogs/maintenance.controller.js \
        src/routes/catalogs/maintenance.routes.js \
        tests/domain/catalogs-maintenance/records.test.js
git commit -m "$(cat <<'EOF'
feat: add maintenance history record endpoints

CRUD de records del historial (crear/listar/obtener/editar) más
aprobación con approvedBy/approvedAt, inmutable tras aprobar.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019mMDQoNgeGbZhP6qnWPdit
EOF
)"
```

---

### Task 7: Libro de mantenimiento por yate (`/maintenance/yachts/:yacht_id/book`)

**Files:**
- Modify: `src/services/catalogs/maintenance.services.js`
- Modify: `src/controllers/catalogs/maintenance.controller.js`
- Modify: `src/routes/catalogs/maintenance.routes.js`
- Test: `tests/domain/catalogs-maintenance/book.test.js`

**Interfaces:**
- Consumes: todos los modelos de Task 2, `Yacht` (catálogo existente).
- Produces: nada consumido por otras tareas — es el endpoint final de agregación.

**Nota de implementación:** `YachtEquipment` tiene dos `hasMany` hermanos en la misma query (`ruleAssignments` y `records`). Sin `separate: true` en ambos, Sequelize arma un solo `JOIN` y duplica/corrompe las filas de los arrays anidados cuando un equipo tiene más de un elemento en cada lado (bug clásico de Sequelize con múltiples `hasMany` anidados al mismo nivel). El test cubre explícitamente un equipo con 2 reglas y 2 records para atrapar esto si se omite `separate: true`.

- [ ] **Step 1: Escribir el test del libro (falla — no hay ruta)**

Crea `tests/domain/catalogs-maintenance/book.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRuleMaterial = require('../../../src/models/catalogs/maintenanceRuleMaterial.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - book', () => {
    it('assembles yacht -> equipment -> rules (with recommended materials) -> history, without duplicating rows', async () => {
        const { yacht } = await createCompanyWithYacht('Book Co', 'Book Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Central' });
        const product = await Product.create({ name: 'Aceite 15W40', type: 'CONSUMABLE' });

        const ruleA = await MaintenanceRule.create({ name: 'Cambio de aceite', periodicityValue: 250, periodicityUnit: 'horas' });
        const ruleB = await MaintenanceRule.create({ name: 'Cambio de filtro', periodicityValue: 500, periodicityUnit: 'horas' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: ruleA.id });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: ruleB.id });
        await MaintenanceRuleMaterial.create({ ruleId: ruleA.id, productId: product.id, recommendedQuantity: 20 });

        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: ruleA.id,
            responsible: 'Juan', workPerformed: 'Cambio de aceite',
            performedAt: new Date('2026-08-01T00:00:00.000Z'),
        });
        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: ruleB.id,
            responsible: 'Pedro', workPerformed: 'Cambio de filtro',
            performedAt: new Date('2026-08-15T00:00:00.000Z'),
        });

        const response = await auth(
            request(app).get(`/api/maintenance/yachts/${Utils.encode(yacht.id)}/book`)
        );

        expect(response.status).toBe(200);
        expect(response.body.yacht.name).toBe(yacht.name);
        expect(response.body.equipment).toHaveLength(1);

        const equipmentBook = response.body.equipment[0];
        expect(equipmentBook.name).toBe('Motor Central');
        expect(equipmentBook.rules).toHaveLength(2);
        const ruleAEntry = equipmentBook.rules.find((r) => r.name === 'Cambio de aceite');
        expect(ruleAEntry.periodicityValue).toBe(250);
        expect(ruleAEntry.recommendedMaterials).toHaveLength(1);
        expect(ruleAEntry.recommendedMaterials[0].product.name).toBe('Aceite 15W40');
        const ruleBEntry = equipmentBook.rules.find((r) => r.name === 'Cambio de filtro');
        expect(ruleBEntry.recommendedMaterials).toHaveLength(0);

        expect(equipmentBook.history).toHaveLength(2);
        expect(equipmentBook.history[0].workPerformed).toBe('Cambio de filtro');
        expect(equipmentBook.history[1].workPerformed).toBe('Cambio de aceite');
    });

    it('reports 404 for a missing yacht', async () => {
        const response = await auth(
            request(app).get(`/api/maintenance/yachts/${Utils.encode(999999999)}/book`)
        );
        expect(response.status).toBe(404);
    });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- tests/domain/catalogs-maintenance/book.test.js`
Expected: FAIL — 404 en `GET /api/maintenance/yachts/:yacht_id/book`.

- [ ] **Step 3: Agregar el método al service**

Agrega en `src/services/catalogs/maintenance.services.js` (con `const Yacht = require('../../models/catalogs/yacht.models');` arriba junto a los demás requires):

```js
    // BOOK
    static async getYachtForBook(yachtId) {
        return Yacht.findOne({ where: { id: yachtId }, attributes: ['id', 'name', 'code'] });
    }

    static async getMaintenanceBook(yachtId) {
        return YachtEquipment.findAll({
            where: { yachtId },
            order: [['name', 'ASC']],
            include: [
                {
                    model: MaintenanceRuleAssignment,
                    as: 'ruleAssignments',
                    where: { active: true },
                    required: false,
                    separate: true,
                    include: [{
                        model: MaintenanceRule,
                        as: 'rule',
                        include: [{
                            model: MaintenanceRuleMaterial,
                            as: 'recommendedMaterials',
                            include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
                        }],
                    }],
                },
                {
                    model: MaintenanceRecord,
                    as: 'records',
                    separate: true,
                    order: [['performedAt', 'DESC']],
                    include: [
                        { model: MaintenanceRule, as: 'rule', attributes: ['id', 'name'] },
                        {
                            model: MaintenanceRecordMaterial,
                            as: 'materials',
                            include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
                        },
                    ],
                },
            ],
        });
    }
```

- [ ] **Step 4: Agregar el handler al controller**

Agrega en `src/controllers/catalogs/maintenance.controller.js`, después de la sección RECORDS:

```js
// BOOK

const getMaintenanceBook = async (req, res, next) => {
    try {
        const yachtId = decodeId(req.params.yacht_id, 'ID de yate');
        const yacht = await MaintenanceService.getYachtForBook(yachtId);
        if (!yacht) {
            throw new AppError('Yate no encontrado', 404);
        }
        const equipment = await MaintenanceService.getMaintenanceBook(yachtId);

        encodeInstanceField(yacht, 'id');

        const equipmentBook = equipment.map((item) => {
            encodeInstanceField(item, 'id');
            encodeInstanceField(item, 'yachtId');

            const rules = item.dataValues.ruleAssignments.map((assignment) => {
                const rule = assignment.dataValues.rule;
                encodeInstanceField(rule, 'id');
                const recommendedMaterials = rule.dataValues.recommendedMaterials.map((material) => {
                    encodeInstanceField(material, 'id');
                    encodeInstanceField(material.dataValues.product, 'id');
                    return material;
                });
                rule.dataValues.recommendedMaterials = recommendedMaterials;
                return rule;
            });

            const history = item.dataValues.records.map((record) => {
                encodeRecord(record);
                return record;
            });

            item.dataValues.rules = rules;
            item.dataValues.history = history;
            delete item.dataValues.ruleAssignments;
            delete item.dataValues.records;
            return item;
        });

        res.status(200).json({ yacht, equipment: equipmentBook });
    } catch (error) {
        next(error);
    }
};
```

Y agrega `getMaintenanceBook,` al objeto `MaintenanceController` exportado.

- [ ] **Step 5: Agregar la ruta**

Agrega en `src/routes/catalogs/maintenance.routes.js`, antes de `module.exports = router;`:

```js
// BOOK

/**
 * @openapi
 * /maintenance/yachts/{yacht_id}/book:
 *   get:
 *     summary: Libro de mantenimiento completo de un yate
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del yate
 *     responses:
 *       200:
 *         description: Yate, sus equipos, las reglas/materiales recomendados de cada uno y su historial
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Yate no encontrado
 *       500:
 *         description: Error inesperado
 */
router.get('/yachts/:yacht_id/book', MaintenanceController.getMaintenanceBook);

```

- [ ] **Step 6: Correr el test completo del dominio y verificar que pasa**

Run: `npm test -- tests/domain/catalogs-maintenance`
Expected: PASS (los 6 archivos: models, equipment, rules, ruleAssignments, records, book).

- [ ] **Step 7: Correr el suite completo del proyecto**

Run: `npm test`
Expected: PASS — todo el proyecto sigue verde, incluyendo el dominio de mantenimiento nuevo.

- [ ] **Step 8: Commit**

```bash
git add src/services/catalogs/maintenance.services.js \
        src/controllers/catalogs/maintenance.controller.js \
        src/routes/catalogs/maintenance.routes.js \
        tests/domain/catalogs-maintenance/book.test.js
git commit -m "$(cat <<'EOF'
feat: add per-yacht maintenance book endpoint

GET /maintenance/yachts/:yacht_id/book arma yate -> equipo -> reglas
(con materiales recomendados) -> historial en una sola respuesta.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019mMDQoNgeGbZhP6qnWPdit
EOF
)"
```

---

### Task 8: Script SQL de migración (artefacto, no se ejecuta automáticamente)

**Files:**
- Create: `docs/superpowers/specs/2026-09-07-maintenance-historial-migration.sql`

**Interfaces:**
- Produces: un archivo de referencia que el usuario decide cuándo y cómo correr contra producción — ningún paso de esta tarea ejecuta SQL contra ninguna base de datos.

- [ ] **Step 1: Escribir el script**

Crea `docs/superpowers/specs/2026-09-07-maintenance-historial-migration.sql`:

```sql
-- Migración: reconstrucción del dominio de mantenimiento desde cero.
-- Ver docs/superpowers/specs/2026-09-07-maintenance-historial-design.md
--
-- ADVERTENCIA: este script borra las tablas viejas del dominio de
-- mantenimiento SIN migrar sus datos (decisión explícita: se parte en
-- limpio). NO se ejecuta automáticamente durante la implementación del
-- código — el usuario decide cuándo correrlo contra producción.

-- 1) DROP de las tablas viejas (nombres reales en BD, ya pluralizados
--    por Sequelize)
DROP TABLE IF EXISTS maintenance_materials;
DROP TABLE IF EXISTS maintenances;
DROP TABLE IF EXISTS maintenancerules_parts;
DROP TABLE IF EXISTS maintenance_rules;
DROP TABLE IF EXISTS yacht_parts;

-- 2) CREATE de las tablas nuevas

CREATE TABLE yacht_equipments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    yacht_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    marca VARCHAR(255) NULL,
    modelo VARCHAR(255) NULL,
    numero_serie VARCHAR(255) NULL,
    potencia VARCHAR(255) NULL,
    rpm VARCHAR(255) NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_yacht_equipments_yacht FOREIGN KEY (yacht_id) REFERENCES yachts(id)
);

CREATE TABLE maintenance_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    periodicity_value FLOAT NULL,
    periodicity_unit VARCHAR(255) NULL,
    instructions TEXT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
);

CREATE TABLE maintenance_rule_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    rule_id INT NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    UNIQUE KEY uq_equipment_rule (equipment_id, rule_id),
    CONSTRAINT fk_mra_equipment FOREIGN KEY (equipment_id) REFERENCES yacht_equipments(id),
    CONSTRAINT fk_mra_rule FOREIGN KEY (rule_id) REFERENCES maintenance_rules(id)
);

CREATE TABLE maintenance_rule_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id INT NOT NULL,
    product_id INT NOT NULL,
    recommended_quantity INT NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_mrm_rule FOREIGN KEY (rule_id) REFERENCES maintenance_rules(id),
    CONSTRAINT fk_mrm_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE maintenance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    yacht_id INT NOT NULL,
    rule_id INT NULL,
    responsable VARCHAR(255) NOT NULL,
    work_performed TEXT NOT NULL,
    performed_at DATETIME NOT NULL,
    hours_reading FLOAT NULL,
    observation TEXT NULL,
    approved_by VARCHAR(255) NULL,
    approved_at DATETIME NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_mr_equipment FOREIGN KEY (equipment_id) REFERENCES yacht_equipments(id),
    CONSTRAINT fk_mr_yacht FOREIGN KEY (yacht_id) REFERENCES yachts(id),
    CONSTRAINT fk_mr_rule FOREIGN KEY (rule_id) REFERENCES maintenance_rules(id)
);

CREATE TABLE maintenance_record_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_mrecm_record FOREIGN KEY (record_id) REFERENCES maintenance_records(id),
    CONSTRAINT fk_mrecm_product FOREIGN KEY (product_id) REFERENCES products(id)
);
```

- [ ] **Step 2: Verificar el script contra los 6 modelos finales**

Revisa cada columna de cada `CREATE TABLE` contra el archivo `.models.js` correspondiente (Task 2) uno por uno — mismo nombre de columna (`field:`), mismo tipo, misma nulabilidad. Si algún modelo cambió durante la implementación de Tasks 3-7 (no debería, pero verificar), actualiza el script antes de continuar.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-07-maintenance-historial-migration.sql
git commit -m "$(cat <<'EOF'
docs: add DDL migration script for maintenance domain rebuild

Script de referencia (DROP tablas viejas + CREATE tablas nuevas) para
que el usuario lo corra contra producción cuando decida — no se
ejecuta automáticamente en ningún paso de este plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019mMDQoNgeGbZhP6qnWPdit
EOF
)"
```
