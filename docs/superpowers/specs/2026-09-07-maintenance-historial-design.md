# Historial de Mantenimiento de Yates — Design

## Contexto y motivación

El dominio `maintenance` actual (`maintenance`, `maintenance_rules`, `maintenancerules_part`, `maintenance_materials`, `yacht_parts`) mezcla "mantenimiento planificado" y "mantenimiento realizado" en una sola tabla mutable (`state`: `planificado` → `realizado` → `aprobado`), calcula automáticamente las horas transcurridas asumiendo el equipo corriendo 24/7 (`hoursElapsed = diffDays * 24`), no tiene bloques `@openapi`, usa `res.status(400).json(error.message)` en vez del `AppError`/`errorHandler` centralizado, y tiene una ruta de `delete` que ni siquiera está montada.

Se decidió reconstruir el dominio completo desde cero (no reusar modelos, controllers, services ni rutas existentes; no migrar los datos actuales — partimos en limpio). El flujo real de trabajo es manual: los mecánicos realizan el mantenimiento y lo anotan en su bitácora física; el jefe de mantenimiento transcribe esa información al sistema. El objetivo es un **libro de mantenimiento por yate**, bien estructurado: qué mantenimientos periódicos le tocan a cada equipo (información de referencia, no calculada ni con alertas) y el historial real de lo ejecutado (fecha, hora, responsable, trabajo realizado), con trazabilidad de quién y cuándo lo aprueba.

**Decisiones explícitas tomadas durante el brainstorming (para no reabrir estas discusiones en implementación):**
- `responsible` es texto libre (no ligado a `Staff`) pero obligatorio.
- Autorización: solo requiere sesión válida (`authJwt.verifyToken`), sin restricción de rol adicional — ya se aplica a nivel de mount en `src/routes/index.js:52` (`app.use("/api/maintenance", authJwt.verifyToken, ...)`), no hace falta tocarlo.
- Se agrega `approvedBy`/`approvedAt` para trazar quién aprueba, no solo un booleano.
- Sin cálculo automático de próximo mantenimiento (ni por horas ni por fecha) — todo lo decide el jefe de mantenimiento manualmente.
- Las reglas de periodicidad (`maintenance_rules`) se mantienen como catálogo informativo por equipo (cada cuánto le toca, qué debe usar), sin disparar ningún cálculo ni alerta.
- Alcance de esta sesión: **solo backend**. No se toca `interno-react`.
- No se migran datos existentes de las tablas viejas — se parte en limpio.

## Alcance

**Dentro de alcance:**
- Reescribir completamente el dominio de mantenimiento: modelos, associations, service, controller, rutas, tests, documentación OpenAPI.
- Borrar todo el código viejo relacionado (`src/models/catalogs/maintenance*.models.js`, `src/models/catalogs/yachtParts.models.js`, `src/controllers/catalogs/maintenance.controller.js`, `src/services/catalogs/maintenance.services.js`, `src/routes/catalogs/maintenance.routes.js`) y las referencias en `src/models/init.models.js`.
- Preparar el SQL de `DROP`/`CREATE` de las tablas nuevas (no se ejecuta automáticamente contra producción — ver sección "Migración de base de datos").
- Endpoint "libro de mantenimiento" por yate.

**Fuera de alcance:**
- Frontend (`interno-react`).
- Cálculo o alerta de próximo mantenimiento (explícitamente descartado).
- Migración de datos de las tablas viejas.
- Vincular `responsible` a un registro real de `Staff`.

## Modelo de datos

Todas las tablas nuevas, sin relación con las viejas. Convención: camelCase en JS, `field:` snake_case en columnas, timestamps por defecto de Sequelize (`createdAt`/`updatedAt`), igual que el resto del proyecto.

### `yacht_equipments`
Reemplaza `yacht_parts`. El equipo/pieza de un yate sujeta a mantenimiento (motor, generador, etc.). Modelo `db.define('yacht_equipment', ...)` — Sequelize pluraliza el nombre de tabla automáticamente (igual que `yacht` → tabla `yachts`, ya lo hace hoy el resto del proyecto), de ahí el nombre real de tabla en plural.

| Campo JS | Columna | Tipo | Null | Notas |
|---|---|---|---|---|
| `id` | `id` | INTEGER PK AI | no | |
| `yachtId` | `yacht_id` | INTEGER FK → `yachts.id` | no | |
| `name` | `name` | STRING | no | |
| `brand` | `marca` | STRING | sí | |
| `model` | `modelo` | STRING | sí | |
| `serialNumber` | `numero_serie` | STRING | sí | |
| `power` | `potencia` | STRING | sí | |
| `rpm` | `rpm` | STRING | sí | |
| `active` | `active` | BOOLEAN | no | default `true` |

Sin campo `hours` — no hay cálculo que dependa de una lectura "en vivo"; la última lectura conocida se consulta desde el `maintenance_record` más reciente de ese equipo.

### `maintenance_rules`
Catálogo informativo: qué mantenimientos periódicos existen y su periodicidad de referencia (no genera cálculos).

| Campo JS | Columna | Tipo | Null | Notas |
|---|---|---|---|---|
| `id` | `id` | INTEGER PK AI | no | |
| `name` | `name` | STRING | no | ej. "Cambio de aceite motor" |
| `periodicityValue` | `periodicity_value` | FLOAT | sí | informativo |
| `periodicityUnit` | `periodicity_unit` | STRING | sí | uno de `horas\|dias\|meses\|anios`, validado en el service |
| `instructions` | `instructions` | TEXT | sí | procedimiento/notas |
| `active` | `active` | BOOLEAN | no | default `true` |

### `maintenance_rule_assignments`
Qué reglas aplican a qué equipo (M:N).

| Campo JS | Columna | Tipo | Null | Notas |
|---|---|---|---|---|
| `id` | `id` | INTEGER PK AI | no | |
| `equipmentId` | `equipment_id` | INTEGER FK → `yacht_equipments.id` | no | |
| `ruleId` | `rule_id` | INTEGER FK → `maintenance_rules.id` | no | |
| `active` | `active` | BOOLEAN | no | default `true` |

Índice único `(equipment_id, rule_id)`.

### `maintenance_rule_materials`
"Qué debe usar" — ligado al catálogo real de `Product` (igual que ya se hace en `maintenance_materials` hoy), no texto libre.

| Campo JS | Columna | Tipo | Null | Notas |
|---|---|---|---|---|
| `id` | `id` | INTEGER PK AI | no | |
| `ruleId` | `rule_id` | INTEGER FK → `maintenance_rules.id` | no | |
| `productId` | `product_id` | INTEGER FK → `products.id` | no | |
| `recommendedQuantity` | `recommended_quantity` | INTEGER | no | |

### `maintenance_records`
**El historial.** Un registro se crea únicamente cuando el mantenimiento ya se realizó — no hay filas "planificadas". Inmutable una vez aprobado; sin `DELETE`.

| Campo JS | Columna | Tipo | Null | Notas |
|---|---|---|---|---|
| `id` | `id` | INTEGER PK AI | no | |
| `equipmentId` | `equipment_id` | INTEGER FK → `yacht_equipments.id` | no | |
| `yachtId` | `yacht_id` | INTEGER FK → `yachts.id` | no | denormalizado a propósito — filtrar historial por yate sin 3 niveles de include |
| `ruleId` | `rule_id` | INTEGER FK → `maintenance_rules.id` | sí | null = correctivo, no ligado a una regla del catálogo |
| `responsible` | `responsable` | STRING | no | mecánico según bitácora |
| `workPerformed` | `work_performed` | TEXT | no | qué se hizo |
| `performedAt` | `performed_at` | DATE (datetime) | no | fecha y hora reales del mantenimiento (según bitácora, no necesariamente "ahora") |
| `hoursReading` | `hours_reading` | FLOAT | sí | lectura del horómetro si el mecánico la anotó; puramente informativo |
| `observation` | `observation` | TEXT | sí | |
| `approvedBy` | `approved_by` | STRING | sí | se llena solo al aprobar |
| `approvedAt` | `approved_at` | DATE (datetime) | sí | se llena solo al aprobar, nunca la manda el cliente |

### `maintenance_record_materials`
Materiales efectivamente usados en un registro del historial.

| Campo JS | Columna | Tipo | Null | Notas |
|---|---|---|---|---|
| `id` | `id` | INTEGER PK AI | no | |
| `recordId` | `record_id` | INTEGER FK → `maintenance_records.id` | no | |
| `productId` | `product_id` | INTEGER FK → `products.id` | no | |
| `quantity` | `quantity` | INTEGER | no | |

### Associations (`src/models/init.models.js`)

```
Yacht.hasMany(YachtEquipment, { as: 'equipment', foreignKey: 'yacht_id' })
YachtEquipment.belongsTo(Yacht, { as: 'yacht', foreignKey: 'yacht_id' })

YachtEquipment.hasMany(MaintenanceRuleAssignment, { as: 'ruleAssignments', foreignKey: 'equipment_id', onDelete: 'CASCADE', hooks: true })
MaintenanceRuleAssignment.belongsTo(YachtEquipment, { as: 'equipment', foreignKey: 'equipment_id' })

MaintenanceRule.hasMany(MaintenanceRuleAssignment, { as: 'assignments', foreignKey: 'rule_id', onDelete: 'CASCADE', hooks: true })
MaintenanceRuleAssignment.belongsTo(MaintenanceRule, { as: 'rule', foreignKey: 'rule_id' })

MaintenanceRule.hasMany(MaintenanceRuleMaterial, { as: 'recommendedMaterials', foreignKey: 'rule_id', onDelete: 'CASCADE', hooks: true })
MaintenanceRuleMaterial.belongsTo(MaintenanceRule, { as: 'rule', foreignKey: 'rule_id' })
MaintenanceRuleMaterial.belongsTo(Product, { as: 'product', foreignKey: 'product_id' })

YachtEquipment.hasMany(MaintenanceRecord, { as: 'records', foreignKey: 'equipment_id' })
MaintenanceRecord.belongsTo(YachtEquipment, { as: 'equipment', foreignKey: 'equipment_id' })
MaintenanceRecord.belongsTo(Yacht, { as: 'yacht', foreignKey: 'yacht_id' })
MaintenanceRule.hasMany(MaintenanceRecord, { as: 'records', foreignKey: 'rule_id' })
MaintenanceRecord.belongsTo(MaintenanceRule, { as: 'rule', foreignKey: 'rule_id' })

MaintenanceRecord.hasMany(MaintenanceRecordMaterial, { as: 'materials', foreignKey: 'record_id', onDelete: 'CASCADE', hooks: true })
MaintenanceRecordMaterial.belongsTo(MaintenanceRecord, { as: 'record', foreignKey: 'record_id' })
MaintenanceRecordMaterial.belongsTo(Product, { as: 'product', foreignKey: 'product_id' })
```

## Reglas de negocio

- **Un `maintenance_record` nunca se borra.** No existe endpoint `DELETE` para records — es un historial, no una lista editable libremente.
- **Inmutabilidad tras aprobación:** `PUT /records/:id` solo funciona mientras `approvedAt` sea `null`. Una vez aprobado, cualquier intento de editar responde `409` (`AppError`).
- **Aprobar exige `approvedBy` en el body.** El service setea `approvedAt = new Date()` — nunca lo manda el cliente. Aprobar un registro ya aprobado responde `409`.
- **Validación de creación:** `equipmentId`, `responsible`, `workPerformed`, `performedAt` son obligatorios. Si viene `ruleId`, debe existir y estar activo. Si vienen `materials`, cada item requiere `productId` + `quantity > 0`.
- `yachtId` en el record se resuelve del lado del servidor a partir del `equipmentId` (no lo manda el cliente) — evita inconsistencias entre el equipo y el yate declarado.

## API (`/api/maintenance`)

Ya protegido con `authJwt.verifyToken` a nivel de mount (`src/routes/index.js`) — no se agrega nada nuevo ahí.

### Equipos
- `GET /equipment?yachtId=` — lista, filtro opcional por yate
- `POST /equipment` — crear
- `PUT /equipment/:equipment_id` — actualizar

### Reglas (catálogo)
- `GET /rules` — lista con `recommendedMaterials` incluidos
- `POST /rules` — crear (`name`, `periodicityValue?`, `periodicityUnit?`, `instructions?`, `recommendedMaterials?: [{productId, recommendedQuantity}]`)
- `PUT /rules/:rule_id` — actualizar

### Asignación regla↔equipo
- `GET /equipment/:equipment_id/rules` — reglas asignadas a un equipo
- `POST /rule-assignments` — asignar (`equipmentId`, `ruleId`)
- `PUT /rule-assignments/:assignment_id` — activar/desactivar (body: `{ active: boolean }`)

### Historial
- `GET /records?yachtId=&equipmentId=&ruleId=&from=&to=` — historial filtrable, `performedAt DESC`
- `GET /records/:record_id`
- `POST /records` — crear (ver validaciones arriba)
- `PUT /records/:record_id` — editar (solo si no aprobado)
- `PUT /records/:record_id/approve` — aprobar (`approvedBy`)

### Libro de mantenimiento
- `GET /yachts/:yacht_id/book`

```json
{
  "yacht": { "id": "...", "name": "...", "code": "..." },
  "equipment": [
    {
      "id": "...",
      "name": "Motor Babor",
      "brand": "...", "model": "...",
      "rules": [
        {
          "id": "...",
          "name": "Cambio de aceite",
          "periodicityValue": 250,
          "periodicityUnit": "horas",
          "instructions": "...",
          "recommendedMaterials": [{ "product": "Aceite 15W40", "recommendedQuantity": 20 }]
        }
      ],
      "history": [
        {
          "id": "...",
          "rule": "Cambio de aceite",
          "responsible": "Juan Pérez",
          "workPerformed": "...",
          "performedAt": "2026-09-05T14:30:00Z",
          "hoursReading": 4230,
          "materials": [{ "product": "Aceite 15W40", "quantity": 20 }],
          "approvedBy": "...",
          "approvedAt": "..."
        }
      ]
    }
  ]
}
```

Todos los ids en las respuestas van codificados con `Utils.encode` (y decodificados con `Utils.decode` en los params de entrada), igual que el resto del sistema.

## Estandarización aplicada

Mismo patrón que `comentCard`/`reports/desempeno`:
- `AppError` + `next(error)` + el `errorHandler` centralizado (`{ error: { message, code } }`) en vez de `res.status(400).json(error.message)`.
- Helpers `decodeId`/`decodeOptionalId` en el controller, igual que `comentCard.controller.js`.
- Bloques `@openapi` por ruta.
- Controllers delgados (try/catch → `next(error)`), toda la lógica de agregación/validación en el service.

## Migración de base de datos

**No hay tooling de migraciones en el repo** (`db.sync({ alter: false })` en `app.js`, sin carpeta `migrations/`). El `.env` local de este repo apunta a la base de **producción** ([[interno-api-production-db-caution]]) — nunca se ejecutan escrituras/DDL contra ella desde una sesión automatizada sin confirmación explícita del usuario en el momento.

Plan:
1. Se prepara el script SQL de `DROP TABLE` (tablas viejas — nombres reales en BD, ya pluralizados por Sequelize: `maintenances`, `maintenance_materials`, `maintenancerules_parts`, `maintenance_rules`, `yacht_parts`) + `CREATE TABLE` (tablas nuevas de este spec: `yacht_equipments`, `maintenance_rules`, `maintenance_rule_assignments`, `maintenance_rule_materials`, `maintenance_records`, `maintenance_record_materials`), como artefacto separado, no como algo que se ejecuta automáticamente durante la implementación del código.
2. El usuario decide cuándo y cómo correrlo contra producción (él mismo, o pidiéndole a la sesión que lo haga con confirmación explícita en ese momento).
3. Los tests de dominio **no** dependen de este paso — corren contra `.env.test` con `db.sync({ force: true })` (`tests/helpers/testApp.js`), una base separada de la de producción.

## Testing

Tests de dominio (Jest + Supertest, DB real vía `tests/helpers/testApp.js`) en `tests/domain/catalogs-maintenance/`, un archivo por área: equipment, rules (+ recommended materials), rule-assignments, records (creación/edición/inmutabilidad post-aprobación), approve, book. Casos a cubrir explícitamente:
- Crear un record sin `ruleId` (correctivo) y con `ruleId`.
- Editar un record no aprobado → funciona; editar uno aprobado → `409`.
- Aprobar sin `approvedBy` → `400`; aprobar dos veces → `409`.
- `GET /records?yachtId=` filtra correctamente entre varios yates.
- `GET /yachts/:yacht_id/book` arma equipment → rules → recommendedMaterials → history en el orden esperado.

## Hallazgos fuera de alcance

- El sistema viejo tenía `deleteMaintenance` en el controller sin ruta montada (código muerto) — no aplica, se reemplaza todo el dominio.
- `yachts.services.js` importa `YachtParts`, `MaintenanceRules`, `MaintenanceRulesPart` sin usarlos (imports muertos) — se limpian como parte de borrar el dominio viejo, pero no es un cambio funcional.
