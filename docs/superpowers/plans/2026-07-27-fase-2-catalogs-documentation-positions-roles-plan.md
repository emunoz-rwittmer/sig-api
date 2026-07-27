# Fase 2 — Dominio Catálogos: Documentation/Positions/Roles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofitear los 11 endpoints de `documentation`/`positions`/`roles` al patrón `AppError`/`next(error)` (incluyendo `404` en los 2 "get by id" cuando el recurso no existe), eliminar 2 métodos de servicio muertos (`positions.services.js`'s `getPositionsById` — roto, `Op` sin importar — y `documentation.services.js`'s `getDocumentsById` — muerto pero no roto), limpiar 2 imports sin uso en `roles.controller.js`, agregar tests profundos por endpoint (incluyendo el efecto real de `createDocument`/`updateDocument` sobre `StaffDocumentation`), y completar la documentación Swagger del dominio.

**Architecture:** Cambios dentro de los 3 controllers del dominio (`documentation`, `positions`, `roles`), sus archivos de rutas (Swagger), y `positions.services.js`/`documentation.services.js` (solo para los 2 borrados puntuales de dead code). Ningún modelo ni forma de respuesta **exitosa** cambia. Los tests nuevos viven en `tests/domain/catalogs-documentation-positions-roles/`, reusando `tests/helpers/testApp.js`, `tests/helpers/auth.js` y `tests/helpers/staffFixtures.js` (`createPosition`) ya existentes — un helper local `createStaffWithPosition` (no compartido) se agrega al archivo de test de `documentation`, siguiendo el mismo patrón ya usado en `tests/domain/auth-staff-users/staff-evaluators.test.js`.

**Tech Stack:** Node.js, Express 4, Sequelize 6 (MySQL), Jest + Supertest, swagger-jsdoc.

## Global Constraints

- Branch: `refactor/fase-2-catalogs-documentation-positions-roles`, creada desde `trunk`, en worktree aislado.
- Cambia la forma de respuesta de **error** en los 11 endpoints (de string plano a `{ "error": { "message", "code" } }`) y el status code de los 2 "get by id" cuando el recurso no existe (`200` + `null` → `404`) — **confirmado por el usuario, mismo acuerdo que en los 2 sub-proyectos anteriores de coordinar el frontend por su cuenta.**
- La forma de respuesta **exitosa** de los 11 endpoints no cambia.
- Ningún cambio de ruta (path, método HTTP, nombre de parámetro) ni de modelo.
- `roles` no tiene "get by id": su único endpoint (`getRoles`) solo cambia de forma de error, sin nuevo status code.
- `docs/superpowers/specs/2026-07-27-fase-2-catalogs-documentation-positions-roles-design.md` es la fuente de verdad del alcance — leerlo si algo en este plan es ambiguo.
- CommonJS (`require`/`module.exports`) en todo el código — sin ESM.
- Windows + Git Bash / PowerShell.
- Cada task termina con `npm test` en verde antes de commitear.
- No se crean archivos de fixtures compartidos nuevos: `tests/helpers/staffFixtures.js` ya exporta `createPosition(name?)`, suficiente junto con un helper local (no exportado) para `documentation`.
- Los tests que crean múltiples registros en el mismo archivo usan nombres/emails únicos (`` `Nombre ${Date.now()}` `` o `` `${Date.now()}-${Math.floor(Math.random() * 1e6)}` ``) para no chocar con constraints `unique: true` (ej. `Staff.email`).
- `PK-encoding`: en cualquier lugar donde se reasigne el `id` codificado de una instancia Sequelize, usar `result.dataValues.id = Utils.encode(result.dataValues.id)` — `result.id = Utils.encode(result.id)` es un no-op sobre el campo PK y NO debe usarse (bug ya corregido en el sub-proyecto anterior).
- `/api/roles` está montado con `authJwt.verifyToken` + `authJwt.isAdmin` (`src/routes/index.js:46`) — el usuario de test ya creado por `createAuthenticatedUser` tiene rol `admin`, así que no requiere ningún ajuste adicional en los tests de `roles`.

---

### Task 1: Retrofit + bug fix + tests + Swagger de `positions` (5 endpoints)

**Files:**
- Modify: `src/controllers/catalogs/positions.controller.js`
- Modify: `src/services/catalogs/positions.services.js`
- Modify: `src/routes/catalogs/positions.routes.js`
- Create: `tests/domain/catalogs-documentation-positions-roles/positions.test.js`

**Interfaces:**
- `PositionsController.*` pasan de `(req, res)` a `(req, res, next)`.
- `PositionService.getPositionsById` se elimina (dead code roto, sin llamantes).
- Consume: `AppError` (`src/errors/AppError.js`), `createPosition(name?)` de `tests/helpers/staffFixtures.js` (ya existente, devuelve una instancia Sequelize `Positions` creada en DB).

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/domain/catalogs-documentation-positions-roles/positions.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createPosition } = require('../../helpers/staffFixtures');
const Positions = require('../../../src/models/catalogs/positions.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('GET /api/positions', () => {
    it('lists positions with encoded id', async () => {
        const position = await createPosition(`Position List ${Date.now()}`);

        const response = await request(app)
            .get('/api/positions')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(position.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(position.name);
    });
});

describe('GET /api/positions/:position_id', () => {
    it('returns a single position with encoded id', async () => {
        const position = await createPosition(`Position Get ${Date.now()}`);

        const response = await request(app)
            .get(`/api/positions/${Utils.encode(position.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(position.id));
        expect(response.body.name).toBe(position.name);
    });

    it('returns 404 when the position does not exist', async () => {
        const response = await request(app)
            .get(`/api/positions/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Posición no encontrada');
    });
});

describe('POST /api/positions/createPosition', () => {
    it('creates a position', async () => {
        const name = `Nueva Posición ${Date.now()}`;
        const response = await request(app)
            .post('/api/positions/createPosition')
            .set('Authorization', `Bearer ${token}`)
            .send({ name });

        expect(response.status).toBe(200);
        const created = await Positions.findOne({ where: { name } });
        expect(created).not.toBeNull();
    });
});

describe('PUT /api/positions/updatePosition/:position_id', () => {
    it('updates a position', async () => {
        const position = await createPosition(`Position Update ${Date.now()}`);

        const response = await request(app)
            .put(`/api/positions/updatePosition/${Utils.encode(position.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Posición Actualizada' });

        expect(response.status).toBe(200);
        await position.reload();
        expect(position.name).toBe('Posición Actualizada');
    });
});

describe('DELETE /api/positions/:position_id', () => {
    it('deletes a position', async () => {
        const position = await createPosition(`Position Delete ${Date.now()}`);

        const response = await request(app)
            .delete(`/api/positions/${Utils.encode(position.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: 'resource deleted successfully' });
        const found = await Positions.findByPk(position.id);
        expect(found).toBeNull();
    });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- tests/domain/catalogs-documentation-positions-roles/positions.test.js`
Expected: FAIL — el test de `404` falla porque hoy el endpoint responde `200` con body `null`.

- [ ] **Step 3: Reescribir `src/controllers/catalogs/positions.controller.js`**

Reemplazar el archivo completo con:

```js
const PositionService = require('../../services/catalogs/positions.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getPositions = async (req, res, next) => {
    try {
        const result = await PositionService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getPosition = async (req, res, next) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const result = await PositionService.getPositionById(positionId);
        if (!result) {
            throw new AppError('Posición no encontrada', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createPosition = async (req, res, next) => {
    try {
        const position = req.body;
        const result = await PositionService.createPosition(position);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updatePosition = async (req, res, next) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const position = req.body;
        delete position.id
        await PositionService.updatePosition(position, {
            where: { id: positionId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deletePosition = async (req, res, next) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const result = await PositionService.delete(positionId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}


const PositionsController = {
    getPositions,
    getPosition,
    createPosition,
    updatePosition,
    deletePosition
}

module.exports = PositionsController
```

- [ ] **Step 4: Eliminar el dead code roto de `src/services/catalogs/positions.services.js`**

Reemplazar el archivo completo con (idéntico al actual, sin el método `getPositionsById`, que usaba `Op.in` sin `Op` importado y no tenía ningún llamante):

```js
const Positions = require('../../models/catalogs/positions.models');

class PositionService {
    static async getAll() {
        try {
            const result = await Positions.findAll({
                attributes: ['id','name'],
                order:[['name', 'ASC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getPositionById(id) {
        try {
            const result = await Positions.findOne({
                where: { id },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createPosition(position) {
        try {
            const result = await Positions.create(position);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updatePosition(position, id) {
        try {
            const result = await Positions.update(position, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(positionId) {
        try {
            const result = await Positions.destroy({
                where: { id: positionId }
            });
            if(result){
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  PositionService;
```

- [ ] **Step 5: Agregar Swagger a `src/routes/catalogs/positions.routes.js`**

Reemplazar el archivo completo con:

```js
const { Router } = require('express');
const PositionsController = require('../../controllers/catalogs/positions.controller');

const router = Router();

/**
 * @openapi
 * /positions:
 *   get:
 *     summary: Listar todas las posiciones
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de posiciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de posición codificado (hashids)
 *                   name:
 *                     type: string
 */
router.get('/', PositionsController.getPositions);

/**
 * @openapi
 * /positions/{position_id}:
 *   get:
 *     summary: Obtener una posición por ID
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: position_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de posición codificado (hashids)
 *     responses:
 *       200:
 *         description: Posición encontrada
 *       404:
 *         description: Posición no encontrada
 */
router.get('/:position_id', PositionsController.getPosition);

/**
 * @openapi
 * /positions/createPosition:
 *   post:
 *     summary: Crear una posición
 *     tags: [Positions]
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
 *     responses:
 *       200:
 *         description: Posición creada
 *       500:
 *         description: Error inesperado
 */
router.post('/createPosition', PositionsController.createPosition);

/**
 * @openapi
 * /positions/updatePosition/{position_id}:
 *   put:
 *     summary: Actualizar una posición
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: position_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de posición codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Posición actualizada
 */
router.put('/updatePosition/:position_id', PositionsController.updatePosition);

/**
 * @openapi
 * /positions/{position_id}:
 *   delete:
 *     summary: Eliminar una posición
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: position_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de posición codificado (hashids)
 *     responses:
 *       200:
 *         description: Posición eliminada
 */
router.delete('/:position_id', PositionsController.deletePosition);


module.exports = router;
```

- [ ] **Step 6: Correr los tests nuevos y confirmar que pasan**

Run: `npm test -- tests/domain/catalogs-documentation-positions-roles/positions.test.js`
Expected: PASS (todos los tests)

- [ ] **Step 7: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS, incluyendo `tests/domain/auth-staff-users/*` (usan `createPosition` y `createStaffWithPosition`) y `tests/domain/catalogs-yachts-company-departaments/*`.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/catalogs/positions.controller.js src/services/catalogs/positions.services.js src/routes/catalogs/positions.routes.js tests/domain/catalogs-documentation-positions-roles/positions.test.js
git commit -m "fix: eliminar dead code roto en positions.services + retrofit AppError + tests profundos + swagger"
```

---

### Task 2: Retrofit + limpieza de imports + tests + Swagger de `roles` (1 endpoint)

**Files:**
- Modify: `src/controllers/catalogs/roles.controller.js`
- Modify: `src/routes/catalogs/roles.routes.js`
- Create: `tests/domain/catalogs-documentation-positions-roles/roles.test.js`

**Interfaces:**
- `RolesController.getRoles` pasa de `(req, res)` a `(req, res, next)`.
- Consume: `AppError` (no se usa en este task — no hay "get by id" en `roles` — se importa el patrón `next(error)` únicamente).

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/domain/catalogs-documentation-positions-roles/roles.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('GET /api/roles', () => {
    it('lists roles with encoded id', async () => {
        const response = await request(app)
            .get('/api/roles')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        const adminRole = response.body.find((x) => x.name === 'admin');
        expect(adminRole).toBeDefined();
        expect(adminRole.id).toBe(Utils.encode(Utils.decode(adminRole.id)));
    });
});
```

Nota: `createAuthenticatedUser` ya crea un `Role` con `name: 'admin'` como parte de su setup (`tests/helpers/auth.js`), así que no hace falta crear un rol nuevo en este test — se verifica sobre el que ya existe. `Utils.encode(Utils.decode(adminRole.id))` es una forma de confirmar que `adminRole.id` es un hashid válido (round-trip) sin necesitar el id numérico crudo del rol.

Este test ya debería pasar contra el código actual (no hay caso `404` que agregar en `roles`) — no es un test que falle antes del retrofit. Se agrega igual como cobertura de regresión antes de tocar el controller, y para confirmar el formato de la respuesta no cambia.

- [ ] **Step 2: Correr el test y confirmar que pasa (ya, antes del retrofit)**

Run: `npm test -- tests/domain/catalogs-documentation-positions-roles/roles.test.js`
Expected: PASS — este endpoint no tiene bug de "no encontrado" que corregir, así que el test ya pasa contra el código legado. Sirve como red de seguridad para el Step 3.

- [ ] **Step 3: Reescribir `src/controllers/catalogs/roles.controller.js`**

Reemplazar el archivo completo con (elimina los imports sin uso de `transporter` y `bcrypt`, agrega `next`):

```js
const RoleService = require('../../services/catalogs/roles.services');
const Utils = require('../../utils/Utils');

const getRoles = async (req, res, next) => {
    try {
        const result = await RoleService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}


const RolesController = {
    getRoles
}

module.exports = RolesController
```

- [ ] **Step 4: Agregar Swagger a `src/routes/catalogs/roles.routes.js`**

Reemplazar el archivo completo con:

```js
const { Router } = require('express');
const RolesController = require('../../controllers/catalogs/roles.controller');

const router = Router();

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: Listar todos los roles (requiere rol admin)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de rol codificado (hashids)
 *                   name:
 *                     type: string
 *       403:
 *         description: Requiere rol admin
 */
router.get('/', RolesController.getRoles);


module.exports = router;
```

- [ ] **Step 5: Correr el test y confirmar que sigue pasando**

Run: `npm test -- tests/domain/catalogs-documentation-positions-roles/roles.test.js`
Expected: PASS

- [ ] **Step 6: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS, incluyendo Task 1 de este mismo plan y todo lo de Fase 0/1/2 anterior.

- [ ] **Step 7: Commit**

```bash
git add src/controllers/catalogs/roles.controller.js src/routes/catalogs/roles.routes.js tests/domain/catalogs-documentation-positions-roles/roles.test.js
git commit -m "fix: eliminar imports sin uso en roles.controller + retrofit AppError + tests + swagger"
```

---

### Task 3: Retrofit + bug fix + tests (incl. efecto StaffDocumentation) + Swagger de `documentation` (5 endpoints)

**Files:**
- Modify: `src/controllers/catalogs/documentation.controller.js`
- Modify: `src/services/catalogs/documentation.services.js`
- Modify: `src/routes/catalogs/documentation.routes.js`
- Create: `tests/domain/catalogs-documentation-positions-roles/documentation.test.js`

**Interfaces:**
- `DocumentsController.*` pasan de `(req, res)` a `(req, res, next)`.
- `DocumentService.getDocumentsById` se elimina (dead code, sin llamantes). El import de `Op` en `documentation.services.js` se mantiene — sigue en uso en `createDocument`/`updateDocument`.
- Consume: `AppError` (`src/errors/AppError.js`), `createPosition(name?)` de `tests/helpers/staffFixtures.js`.
- Produce (helper local, solo en este archivo de test, no exportado): `createStaffWithPosition(position)` — crea un `Departament` + `Staff` con `positionId: position.id`, devuelve la instancia `Staff`. Mismo patrón que `tests/domain/auth-staff-users/staff-evaluators.test.js:21-34`.

**Nota de comportamiento (no se toca en esta task, ya documentada en el spec):** `createDocument`/`updateDocument` usan una transacción Sequelize y, cuando el documento tiene `positions` (array de ids de `Positions` codificados), crean o eliminan registros `StaffDocumentation` (`status: 'pending'`) para cada `Staff` cuyo `positionId` esté en esa lista. Este comportamiento existente debe preservarse intacto — los tests de esta task lo verifican explícitamente.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/domain/catalogs-documentation-positions-roles/documentation.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition } = require('../../helpers/staffFixtures');
const Documentation = require('../../../src/models/catalogs/documentation.models');
const Staff = require('../../../src/models/catalogs/staff.models');
const StaffDocumentation = require('../../../src/models/catalogs/staffDocumentation.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

async function createStaffWithPosition(position) {
    const departament = await createDepartment();
    return Staff.create({
        firstName: 'Doc',
        lastName: `Test${Date.now()}${Math.floor(Math.random() * 1e6)}`,
        email: `doc-test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
    });
}

async function createBasicDocument(overrides = {}) {
    return Documentation.create({
        name: `Documento ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        description: 'Descripción de prueba',
        required: false,
        positions: [],
        ...overrides,
    });
}

describe('GET /api/documentation', () => {
    it('lists documents with encoded id', async () => {
        const document = await createBasicDocument({ name: `Documento List ${Date.now()}` });

        const response = await request(app)
            .get('/api/documentation')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(document.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(document.name);
    });
});

describe('GET /api/documentation/:document_id', () => {
    it('returns a single document with encoded id', async () => {
        const document = await createBasicDocument({ name: `Documento Get ${Date.now()}` });

        const response = await request(app)
            .get(`/api/documentation/${Utils.encode(document.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(document.id));
        expect(response.body.name).toBe(document.name);
    });

    it('returns 404 when the document does not exist', async () => {
        const response = await request(app)
            .get(`/api/documentation/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Documento no encontrado');
    });
});

describe('POST /api/documentation/createDocument', () => {
    it('creates a document without positions', async () => {
        const name = `Nuevo Documento ${Date.now()}`;
        const response = await request(app)
            .post('/api/documentation/createDocument')
            .set('Authorization', `Bearer ${token}`)
            .send({ name, description: 'Test', required: true, positions: [] });

        expect(response.status).toBe(200);
        const created = await Documentation.findOne({ where: { name } });
        expect(created).not.toBeNull();
        expect(created.required).toBe(true);
    });

    it('creates pending StaffDocumentation for staff whose position is included', async () => {
        const position = await createPosition(`Position Doc Create ${Date.now()}`);
        const staffWithPosition = await createStaffWithPosition(position);
        const otherPosition = await createPosition(`Position Doc Create Other ${Date.now()}`);
        const staffWithoutPosition = await createStaffWithPosition(otherPosition);

        const name = `Documento Con Posiciones ${Date.now()}`;
        const response = await request(app)
            .post('/api/documentation/createDocument')
            .set('Authorization', `Bearer ${token}`)
            .send({ name, description: 'Test', required: true, positions: [Utils.encode(position.id)] });

        expect(response.status).toBe(200);
        const created = await Documentation.findOne({ where: { name } });

        const staffDocs = await StaffDocumentation.findAll({ where: { documentId: created.id } });
        expect(staffDocs).toHaveLength(1);
        expect(staffDocs[0].staffId).toBe(staffWithPosition.id);
        expect(staffDocs[0].status).toBe('pending');

        const staffDocsForOther = await StaffDocumentation.findAll({ where: { documentId: created.id, staffId: staffWithoutPosition.id } });
        expect(staffDocsForOther).toHaveLength(0);
    });
});

describe('PUT /api/documentation/updateDocument/:document_id', () => {
    it('updates a document', async () => {
        const document = await createBasicDocument({ name: `Documento Update ${Date.now()}` });

        const response = await request(app)
            .put(`/api/documentation/updateDocument/${Utils.encode(document.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Documento Actualizado', description: document.description, required: document.required, positions: [] });

        expect(response.status).toBe(200);
        await document.reload();
        expect(document.name).toBe('Documento Actualizado');
    });

    it('moves StaffDocumentation when positions change from one position to another', async () => {
        const oldPosition = await createPosition(`Position Doc Update Old ${Date.now()}`);
        const newPosition = await createPosition(`Position Doc Update New ${Date.now()}`);
        const staffOld = await createStaffWithPosition(oldPosition);
        const staffNew = await createStaffWithPosition(newPosition);

        const document = await createBasicDocument({
            name: `Documento Reasignar ${Date.now()}`,
            positions: [Utils.encode(oldPosition.id)],
        });
        await StaffDocumentation.create({ staffId: staffOld.id, documentId: document.id, status: 'pending' });

        const response = await request(app)
            .put(`/api/documentation/updateDocument/${Utils.encode(document.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: document.name, description: document.description, required: document.required, positions: [Utils.encode(newPosition.id)] });

        expect(response.status).toBe(200);

        const staffDocsForOld = await StaffDocumentation.findAll({ where: { documentId: document.id, staffId: staffOld.id } });
        expect(staffDocsForOld).toHaveLength(0);

        const staffDocsForNew = await StaffDocumentation.findAll({ where: { documentId: document.id, staffId: staffNew.id } });
        expect(staffDocsForNew).toHaveLength(1);
        expect(staffDocsForNew[0].status).toBe('pending');
    });
});

describe('DELETE /api/documentation/:document_id', () => {
    it('deletes a document', async () => {
        const document = await createBasicDocument({ name: `Documento Delete ${Date.now()}` });

        const response = await request(app)
            .delete(`/api/documentation/${Utils.encode(document.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: 'resource deleted successfully' });
        const found = await Documentation.findByPk(document.id);
        expect(found).toBeNull();
    });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- tests/domain/catalogs-documentation-positions-roles/documentation.test.js`
Expected: FAIL — el test de `404` falla (hoy responde `200` + `null`). Los tests de efecto `StaffDocumentation` deberían PASAR ya contra el código actual (esa lógica no cambia en este task) — si fallan, es una señal de que el comportamiento real difiere de lo documentado en el spec; investigar antes de continuar (no asumir que el test está mal).

- [ ] **Step 3: Eliminar el dead code de `src/services/catalogs/documentation.services.js`**

Reemplazar el archivo completo con (idéntico al actual, sin el método `getDocumentsById`; el import de `Op` se mantiene porque `createDocument` y `updateDocument` lo siguen usando):

```js
const Documentation = require('../../models/catalogs/documentation.models');
const Staff = require('../../models/catalogs/staff.models');
const StaffDocumentation = require('../../models/catalogs/staffDocumentation.models');
const Utils = require('../../utils/Utils');
const { Op } = require('sequelize');
const db = require('../../utils/database');

class DocumentService {
    static async getAll() {
        try {
            const result = await Documentation.findAll({
                attributes: ['id', 'name', 'description', 'required','positions'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getDocumentById(id) {
        try {
            const result = await Documentation.findOne({
                where: { id },
                attributes: ['id', 'name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createDocument(document) {
        const transaction = await db.transaction();
        try {
            // Crear el documento
            const result = await Documentation.create(document, { transaction });

            // Si el documento tiene posiciones, crear StaffDocumentation para cada staff con esa posición
            if (document.positions && Array.isArray(document.positions) && document.positions.length > 0) {
                // Decodificar los IDs de posiciones
                const positionIds = document.positions.map(encodedId => {
                    try {
                        return Utils.decode(encodedId);
                    } catch (error) {
                        console.error('Error decodificando posición:', encodedId);
                        return null;
                    }
                }).filter(id => id !== null);

                // Buscar todos los staffs que tengan alguna de esas posiciones
                if (positionIds.length > 0) {
                    const staffMembers = await Staff.findAll({
                        where: {
                            positionId: {
                                [Op.in]: positionIds
                            }
                        },
                        attributes: ['id'],
                        transaction
                    });

                    // Crear StaffDocumentation para cada staff
                    if (staffMembers.length > 0) {
                        const staffDocumentations = staffMembers.map(staff => ({
                            staffId: staff.id,
                            documentId: result.id,
                            status: 'pending',
                        }));

                        await StaffDocumentation.bulkCreate(staffDocumentations, { transaction });
                    }
                }
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateDocument(document, id) {
        const transaction = await db.transaction();
        try {
            // Obtener el documento actual para comparar posiciones
            const currentDocument = await Documentation.findOne({
                where: { id },
                transaction
            });

            if (!currentDocument) {
                throw new Error('Documento no encontrado');
            }

            // Obtener posiciones viejas y nuevas
            const oldPositions = currentDocument.positions || [];
            const newPositions = document.positions || [];

            // Asegurar que sean arrays
            const oldPositionIds = (Array.isArray(oldPositions) ? oldPositions : [oldPositions]).map(pos => {
                try {
                    return Utils.decode(pos);
                } catch (error) {
                    console.error('Error decodificando posición antigua:', pos);
                    return null;
                }
            }).filter(id => id !== null);

            const newPositionIds = (Array.isArray(newPositions) ? newPositions : [newPositions]).map(pos => {
                try {
                    return Utils.decode(pos);
                } catch (error) {
                    console.error('Error decodificando posición nueva:', pos);
                    return null;
                }
            }).filter(id => id !== null);

            // Identificar posiciones agregadas y eliminadas
            const positionsAdded = newPositionIds.filter(pos => !oldPositionIds.includes(pos));
            const positionsRemoved = oldPositionIds.filter(pos => !newPositionIds.includes(pos));

            // Crear StaffDocumentation para las posiciones agregadas
            if (positionsAdded.length > 0) {
                const staffMembers = await Staff.findAll({
                    where: {
                        positionId: {
                            [Op.in]: positionsAdded
                        }
                    },
                    attributes: ['id'],
                    transaction
                });

                if (staffMembers.length > 0) {
                    // Solo crear para staffs que no tengan ya una documentación para este documento
                    const existingDocumentations = await StaffDocumentation.findAll({
                        where: {
                            documentId: id,
                            staffId: {
                                [Op.in]: staffMembers.map(s => s.id)
                            }
                        },
                        attributes: ['staffId'],
                        transaction
                    });

                    const existingStaffIds = existingDocumentations.map(doc => doc.staffId);
                    const newStaffIds = staffMembers.filter(staff => !existingStaffIds.includes(staff.id)).map(staff => staff.id);

                    if (newStaffIds.length > 0) {
                        const staffDocumentations = staffMembers
                            .filter(staff => newStaffIds.includes(staff.id))
                            .map(staff => ({
                                staffId: staff.id,
                                documentId: id,
                                status: 'pending',
                            }));

                        await StaffDocumentation.bulkCreate(staffDocumentations, { transaction });
                    }
                }
            }

            // Eliminar StaffDocumentation para las posiciones removidas
            if (positionsRemoved.length > 0) {
                const staffToRemove = await Staff.findAll({
                    where: {
                        positionId: {
                            [Op.in]: positionsRemoved
                        }
                    },
                    attributes: ['id'],
                    transaction
                });

                if (staffToRemove.length > 0) {
                    await StaffDocumentation.destroy({
                        where: {
                            documentId: id,
                            staffId: {
                                [Op.in]: staffToRemove.map(s => s.id)
                            }
                        },
                        transaction
                    });
                }
            }

            // Actualizar el documento
            const result = await Documentation.update(document, {
                where: { id },
                transaction
            });

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async delete(documentId) {
        try {
            const result = await Documentation.destroy({
                where: { id: documentId }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports = DocumentService;
```

- [ ] **Step 4: Reescribir `src/controllers/catalogs/documentation.controller.js`**

Reemplazar el archivo completo con:

```js
const DocumentService = require('../../services/catalogs/documentation.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getDocuments = async (req, res, next) => {
    try {
        const result = await DocumentService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getDocument = async (req, res, next) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const result = await DocumentService.getDocumentById(documentId);
        if (!result) {
            throw new AppError('Documento no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createDocument = async (req, res, next) => {
    try {
        const document = req.body;
        // Asegurar que positions sea un array
        if (!Array.isArray(document.positions)) {
            document.positions = [document.positions];
        }

        const result = await DocumentService.createDocument(document);
        res.status(200).json({ data: 'resource created successfully', documentId: result.id });
    } catch (error) {
        next(error);
    }
}

const updateDocument = async (req, res, next) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const document = req.body;
        delete document.id;
        await DocumentService.updateDocument(document, documentId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteDocument = async (req, res, next) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const result = await DocumentService.delete(documentId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}


const DocumentsController = {
    getDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument
}

module.exports = DocumentsController
```

Nota: se elimina la línea `document.positions = document.positions;` de `updateDocument` (era un no-op sin efecto, ver spec "Fuera de alcance" — se retira por ser ruido muerto en una función que de todas formas se está reescribiendo completa, no porque cambie comportamiento).

- [ ] **Step 5: Agregar Swagger a `src/routes/catalogs/documentation.routes.js`**

Reemplazar el archivo completo con:

```js
const { Router } = require('express');
const DocumentsController = require('../../controllers/catalogs/documentation.controller');

const router = Router();

/**
 * @openapi
 * /documentation:
 *   get:
 *     summary: Listar todos los documentos
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de documentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de documento codificado (hashids)
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   required:
 *                     type: boolean
 *                   positions:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: IDs de posiciones codificados (hashids)
 */
router.get('/', DocumentsController.getDocuments);

/**
 * @openapi
 * /documentation/{document_id}:
 *   get:
 *     summary: Obtener un documento por ID
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de documento codificado (hashids)
 *     responses:
 *       200:
 *         description: Documento encontrado
 *       404:
 *         description: Documento no encontrado
 */
router.get('/:document_id', DocumentsController.getDocument);

/**
 * @openapi
 * /documentation/createDocument:
 *   post:
 *     summary: Crear un documento (genera StaffDocumentation pendientes para el staff con las posiciones indicadas)
 *     tags: [Documentation]
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
 *               description:
 *                 type: string
 *               required:
 *                 type: boolean
 *               positions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de posiciones codificados (hashids) — staff con estas posiciones recibe un StaffDocumentation pendiente
 *     responses:
 *       200:
 *         description: Documento creado
 *       500:
 *         description: Error inesperado
 */
router.post('/createDocument', DocumentsController.createDocument);

/**
 * @openapi
 * /documentation/updateDocument/{document_id}:
 *   put:
 *     summary: Actualizar un documento (reconcilia StaffDocumentation según el cambio de posiciones)
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de documento codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               required:
 *                 type: boolean
 *               positions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de posiciones codificados (hashids)
 *     responses:
 *       200:
 *         description: Documento actualizado
 */
router.put('/updateDocument/:document_id', DocumentsController.updateDocument);

/**
 * @openapi
 * /documentation/{document_id}:
 *   delete:
 *     summary: Eliminar un documento
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de documento codificado (hashids)
 *     responses:
 *       200:
 *         description: Documento eliminado
 */
router.delete('/:document_id', DocumentsController.deleteDocument);


module.exports = router;
```

- [ ] **Step 6: Correr los tests nuevos y confirmar que pasan**

Run: `npm test -- tests/domain/catalogs-documentation-positions-roles/documentation.test.js`
Expected: PASS (todos los tests)

- [ ] **Step 7: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS — incluyendo Task 1 y Task 2 de este mismo plan, y todo lo de Fase 0/1/2 anterior.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/catalogs/documentation.controller.js src/services/catalogs/documentation.services.js src/routes/catalogs/documentation.routes.js tests/domain/catalogs-documentation-positions-roles/documentation.test.js
git commit -m "fix: eliminar dead code en documentation.services + retrofit AppError + tests profundos (incl. efecto StaffDocumentation) + swagger"
```

---

### Task 4: Verificación final y actualización de `CONVENTIONS.md`

**Files:**
- Modify: `docs/CONVENTIONS.md`

**Interfaces:** Ninguna — solo documentación.

- [ ] **Step 1: Actualizar la lista de dominios retrofiteados**

En `docs/CONVENTIONS.md`, reemplazar:

```
El retrofit de los controllers existentes al patrón nuevo se hace dominio
por dominio en Fase 2. Dominios ya retrofiteados: `auth`, `staff`, `users`,
`yachts`, `company`, `departaments`.
```

por:

```
El retrofit de los controllers existentes al patrón nuevo se hace dominio
por dominio en Fase 2. Dominios ya retrofiteados: `auth`, `staff`, `users`,
`yachts`, `company`, `departaments`, `documentation`, `positions`, `roles`.
```

- [ ] **Step 2: Correr la suite completa una última vez**

Run: `npm test`
Expected: todos los tests PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/CONVENTIONS.md
git commit -m "docs: actualizar CONVENTIONS.md con dominios documentation/positions/roles retrofiteados"
```
