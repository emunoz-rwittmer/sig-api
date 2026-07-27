# Fase 2 — Dominio Catálogos: Yachts/Company/Departaments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofitear los 16 endpoints de `yachts`/`company`/`departaments` al patrón `AppError`/`next(error)` (incluyendo `404` en los 4 "get by id" cuando el recurso no existe), corregir 2 bugs reales encontrados durante el diseño (`getDepartamentsById` con `Op` no importado, `createCompany` sin validar archivo subido), agregar tests profundos por endpoint, y completar la documentación Swagger del dominio.

**Architecture:** Cambios dentro de los 3 controllers del dominio (`yachts`, `company`, `departaments`) y sus archivos de rutas (Swagger). Un solo archivo de servicio tocado, solo para el bug fix puntual (`departaments.services.js`, se elimina una función muerta). Ningún modelo ni forma de respuesta **exitosa** cambia. Los tests nuevos viven en `tests/domain/catalogs-yachts-company-departaments/`, reusando `tests/helpers/testApp.js`, `tests/helpers/auth.js` y `tests/helpers/staffFixtures.js` (ya existentes desde Fase 2 auth/staff/users — no se crean fixtures nuevos).

**Tech Stack:** Node.js, Express 4, Sequelize 6 (MySQL), Jest + Supertest, swagger-jsdoc, Multer.

## Global Constraints

- Branch: `refactor/fase-2-catalogs-yachts-company-departaments`, creada desde `trunk`, en worktree aislado.
- Cambia la forma de respuesta de **error** en los 16 endpoints (de string plano a `{ "error": { "message", "code" } }`) y el status code de los 4 "get by id" cuando el recurso no existe (`200` + `null` → `404`) — **confirmado por el usuario, mismo acuerdo que en el sub-proyecto anterior de coordinar el frontend por su cuenta.**
- La forma de respuesta **exitosa** de los 16 endpoints no cambia.
- Ningún cambio de ruta (path, método HTTP, nombre de parámetro) ni de modelo.
- `docs/superpowers/specs/2026-07-27-fase-2-catalogs-yachts-company-departaments-design.md` es la fuente de verdad del alcance — leerlo si algo en este plan es ambiguo.
- CommonJS (`require`/`module.exports`) en todo el código — sin ESM.
- Windows + Git Bash / PowerShell.
- Cada task termina con `npm test` en verde antes de commitear.
- No se crean archivos de fixtures nuevos: `tests/helpers/staffFixtures.js` ya exporta `createDepartment(name?)` y `createCompanyWithYacht(companyName?, yachtName?)`, suficientes para los 3 dominios de este plan.
- Los tests que crean múltiples empresas/yates/departamentos en el mismo archivo usan nombres/emails únicos (`` `Nombre ${Date.now()}` ``) para no chocar con la constraint `unique: true` de `Yacht.email` ni con búsquedas por nombre entre tests del mismo archivo — mismo patrón que `tests/domain/auth-staff-users/staff-crud.test.js`.
- Ningún test adjunta archivos reales (`.attach(...)`) a los endpoints de upload — se sigue el precedente ya establecido en `staff-crud.test.js`, que solo prueba el caso `400` de archivo faltante, no una subida real a disco.

---

### Task 1: Retrofit + tests + Swagger de `yachts` (5 endpoints)

**Files:**
- Modify: `src/controllers/catalogs/yachts.controller.js`
- Modify: `src/routes/catalogs/yachts.routes.js`
- Create: `tests/domain/catalogs-yachts-company-departaments/yachts.test.js`

**Interfaces:**
- `YachtController.*` pasan de `(req, res)` a `(req, res, next)` — Express siempre pasa 3 argumentos a un route handler, así que las rutas no cambian de firma de montaje.
- Consume: `AppError` (`src/errors/AppError.js`), `createCompanyWithYacht(companyName?, yachtName?)` de `tests/helpers/staffFixtures.js` (devuelve `{ company, yacht }`, instancias Sequelize ya creadas en DB).

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/domain/catalogs-yachts-company-departaments/yachts.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Company = require('../../../src/models/catalogs/company.models');
const Yacht = require('../../../src/models/catalogs/yacht.models');
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

describe('GET /api/yachts', () => {
    it('lists yachts with encoded id, companyId and nested company name', async () => {
        const { company, yacht } = await createCompanyWithYacht(`Company List ${Date.now()}`, `Yacht List ${Date.now()}`);

        const response = await request(app)
            .get('/api/yachts')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(yacht.id));
        expect(found).toBeDefined();
        expect(found.companyId).toBe(Utils.encode(company.id));
        expect(found.company.name).toBe(company.name);
    });
});

describe('GET /api/yachts/:yacht_id', () => {
    it('returns a single yacht with encoded ids', async () => {
        const { company, yacht } = await createCompanyWithYacht(`Company Get ${Date.now()}`, `Yacht Get ${Date.now()}`);

        const response = await request(app)
            .get(`/api/yachts/${Utils.encode(yacht.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(yacht.id));
        expect(response.body.companyId).toBe(Utils.encode(company.id));
    });

    it('returns 404 when the yacht does not exist', async () => {
        const response = await request(app)
            .get(`/api/yachts/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Yate no encontrado');
    });
});

describe('POST /api/yachts/createYacht', () => {
    it('creates a yacht with decoded companyId', async () => {
        const company = await Company.create({
            name: `Company Create ${Date.now()}`,
            ruc: '1234567890001',
            logo: '/uploads/companies/test-logo.png',
            adress: 'Av. Test 123',
        });

        const response = await request(app)
            .post('/api/yachts/createYacht')
            .set('Authorization', `Bearer ${token}`)
            .send({
                companyId: Utils.encode(company.id),
                name: 'Nuevo Yate',
                email: `nuevo-yate-${Date.now()}@example.com`,
                code: 'YT-100',
                color: '#000000',
            });

        expect(response.status).toBe(200);
        const created = await Yacht.findOne({ where: { name: 'Nuevo Yate' } });
        expect(created).not.toBeNull();
        expect(created.companyId).toBe(company.id);
    });
});

describe('PUT /api/yachts/updateYacht/:yacht_id', () => {
    it('updates a yacht, including reassigning its companyId', async () => {
        const { yacht } = await createCompanyWithYacht(`Company Update ${Date.now()}`, `Yacht Update ${Date.now()}`);
        const newCompany = await Company.create({
            name: `Company Update Target ${Date.now()}`,
            ruc: '1234567890002',
            logo: '/uploads/companies/test-logo.png',
            adress: 'Av. Test 456',
        });

        const response = await request(app)
            .put(`/api/yachts/updateYacht/${Utils.encode(yacht.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                companyId: Utils.encode(newCompany.id),
                name: 'Yate Actualizado',
            });

        expect(response.status).toBe(200);
        await yacht.reload();
        expect(yacht.name).toBe('Yate Actualizado');
        expect(yacht.companyId).toBe(newCompany.id);
    });
});

describe('DELETE /api/yachts/:yacht_id', () => {
    it('deletes a yacht', async () => {
        const { yacht } = await createCompanyWithYacht(`Company Delete ${Date.now()}`, `Yacht Delete ${Date.now()}`);

        const response = await request(app)
            .delete(`/api/yachts/${Utils.encode(yacht.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Yacht.findByPk(yacht.id);
        expect(found).toBeNull();
    });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- tests/domain/catalogs-yachts-company-departaments/yachts.test.js`
Expected: FAIL — el test de `404` falla porque hoy el endpoint responde `200` con body `null`; el resto de tests puede pasar el `status` pero conviene confirmar que el archivo corre (no hay errores de import) antes de tocar el controller.

- [ ] **Step 3: Reescribir `src/controllers/catalogs/yachts.controller.js`**

Reemplazar el archivo completo con:

```js
const YachtService = require('../../services/catalogs/yachts.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getAllYachts = async (req, res, next) => {
    try {
        const result = await YachtService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.companyId = Utils.encode(x.dataValues.companyId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getYacht = async (req, res, next) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const result = await YachtService.getYachtById(yachtId);
        if (!result) {
            throw new AppError('Yate no encontrado', 404);
        }
        result.id = Utils.encode(result.id);
        result.companyId = Utils.encode(result.companyId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createYacht = async (req, res, next) => {
    try {
        const yacht = req.body;
        yacht.companyId = Utils.decode(yacht.companyId)
        await YachtService.createYacht(yacht);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}

const updateYacht = async (req, res, next) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const yacht = req.body;
        delete yacht.id
        yacht.companyId = Utils.decode(yacht.companyId)
        await YachtService.updateYacht(yacht, {
            where: { id: yachtId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteYacht = async (req, res, next) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        await YachtService.delete({
            where: { id: yachtId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
    }
}

const YachtController = {
    getAllYachts,
    getYacht,
    createYacht,
    updateYacht,
    deleteYacht,
}
module.exports = YachtController
```

- [ ] **Step 4: Agregar Swagger a `src/routes/catalogs/yachts.routes.js`**

Reemplazar el archivo completo con:

```js
const { Router } = require('express');
const YachtController = require('../../controllers/catalogs/yachts.controller');

const router = Router();

/**
 * @openapi
 * /yachts:
 *   get:
 *     summary: Listar todos los yates
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de yates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de yate codificado (hashids)
 *                   name:
 *                     type: string
 *                   code:
 *                     type: string
 *                   color:
 *                     type: string
 *                   companyId:
 *                     type: string
 *                     description: ID de empresa codificado (hashids)
 *                   email:
 *                     type: string
 *                   active:
 *                     type: boolean
 *                   company:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 */
router.get('/', YachtController.getAllYachts);

/**
 * @openapi
 * /yachts/{yacht_id}:
 *   get:
 *     summary: Obtener un yate por ID
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de yate codificado (hashids)
 *     responses:
 *       200:
 *         description: Yate encontrado
 *       404:
 *         description: Yate no encontrado
 */
router.get('/:yacht_id', YachtController.getYacht);

/**
 * @openapi
 * /yachts/createYacht:
 *   post:
 *     summary: Crear un yate
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyId, name, email, code, color]
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: ID de empresa codificado (hashids)
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yate creado
 *       500:
 *         description: Error inesperado
 */
router.post('/createYacht', YachtController.createYacht);

/**
 * @openapi
 * /yachts/updateYacht/{yacht_id}:
 *   put:
 *     summary: Actualizar un yate
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de yate codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: ID de empresa codificado (hashids)
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yate actualizado
 */
router.put('/updateYacht/:yacht_id', YachtController.updateYacht);

/**
 * @openapi
 * /yachts/{yacht_id}:
 *   delete:
 *     summary: Eliminar un yate
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de yate codificado (hashids)
 *     responses:
 *       200:
 *         description: Yate eliminado
 */
router.delete('/:yacht_id', YachtController.deleteYacht);


module.exports = router;
```

- [ ] **Step 5: Correr los tests nuevos y confirmar que pasan**

Run: `npm test -- tests/domain/catalogs-yachts-company-departaments/yachts.test.js`
Expected: PASS (todos los tests)

- [ ] **Step 6: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS, incluyendo `tests/domain/auth-staff-users/*` y todos los smoke tests existentes.

- [ ] **Step 7: Commit**

```bash
git add src/controllers/catalogs/yachts.controller.js src/routes/catalogs/yachts.routes.js tests/domain/catalogs-yachts-company-departaments/yachts.test.js
git commit -m "feat: retrofit AppError + tests profundos + swagger en dominio yachts"
```

---

### Task 2: Retrofit + bug fix + tests + Swagger de `company` (5 endpoints)

**Files:**
- Modify: `src/controllers/catalogs/company.controller.js`
- Modify: `src/routes/catalogs/company.routes.js`
- Create: `tests/domain/catalogs-yachts-company-departaments/company.test.js`

**Interfaces:**
- `CompanyController.*` pasan de `(req, res)` a `(req, res, next)`.
- Consume: `AppError` (`src/errors/AppError.js`).

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/domain/catalogs-yachts-company-departaments/company.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const Company = require('../../../src/models/catalogs/company.models');
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

async function createBasicCompany(overrides = {}) {
    return Company.create({
        name: `Company ${Date.now()}-${Math.random()}`,
        ruc: '1234567890001',
        logo: '/uploads/companies/test-logo.png',
        adress: 'Av. Test 123',
        ...overrides,
    });
}

describe('GET /api/companies', () => {
    it('lists companies with encoded id', async () => {
        const company = await createBasicCompany({ name: `Company List ${Date.now()}` });

        const response = await request(app)
            .get('/api/companies')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(company.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(company.name);
    });
});

describe('GET /api/companies/:company_id', () => {
    it('returns a single company with encoded id', async () => {
        const company = await createBasicCompany({ name: `Company Get ${Date.now()}` });

        const response = await request(app)
            .get(`/api/companies/${Utils.encode(company.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(company.id));
        expect(response.body.name).toBe(company.name);
    });

    it('returns 404 when the company does not exist', async () => {
        const response = await request(app)
            .get(`/api/companies/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Empresa no encontrada');
    });
});

describe('POST /api/companies/createCompany', () => {
    it('returns 400 when no logo file is uploaded', async () => {
        const response = await request(app)
            .post('/api/companies/createCompany')
            .set('Authorization', `Bearer ${token}`)
            .field('name', `Sin Logo ${Date.now()}`)
            .field('ruc', '1234567890099')
            .field('adress', 'Av. Sin Logo');

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No se ha subido ningún archivo');
    });
});

describe('PUT /api/companies/updateCompany/:company_id', () => {
    it('updates a company without changing the logo when no file is sent', async () => {
        const company = await createBasicCompany({ name: `Company Update ${Date.now()}` });

        const response = await request(app)
            .put(`/api/companies/updateCompany/${Utils.encode(company.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'Company Actualizada');

        expect(response.status).toBe(200);
        await company.reload();
        expect(company.name).toBe('Company Actualizada');
        expect(company.logo).toBe('/uploads/companies/test-logo.png');
    });
});

describe('DELETE /api/companies/:company_id', () => {
    it('deletes a company', async () => {
        const company = await createBasicCompany({ name: `Company Delete ${Date.now()}` });

        const response = await request(app)
            .delete(`/api/companies/${Utils.encode(company.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Company.findByPk(company.id);
        expect(found).toBeNull();
    });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- tests/domain/catalogs-yachts-company-departaments/company.test.js`
Expected: FAIL — el test de `404` falla (hoy responde `200` + `null`), y el test de `createCompany` sin logo falla porque hoy el `TypeError` crudo de `req.files[0].filename` cae al `catch` genérico y responde `400` con un string plano, no `{"error":{"message":"No se ha subido ningún archivo"}}`.

- [ ] **Step 3: Reescribir `src/controllers/catalogs/company.controller.js`**

Reemplazar el archivo completo con:

```js
const CompanyService = require('../../services/catalogs/company.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getAllCompanys = async (req, res, next) => {
    try {
        const result = await CompanyService.getAll();
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

const getCompany = async (req, res, next) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await CompanyService.getCompanyById(companyId);
        if (!result) {
            throw new AppError('Empresa no encontrada', 404);
        }
        result.id = Utils.encode(result.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createCompany = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            throw new AppError('No se ha subido ningún archivo', 400);
        }
        const company = req.body;
        company.logo = `/uploads/companies/${req.files[0].filename}`
        const result = await CompanyService.createCompany(company);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateCompany = async (req, res, next) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const company = req.body;
        if (req.files.length > 0) {
            company.logo = `/uploads/companies/${req.files[0].filename}`
        }
        await CompanyService.updateCompany(company, {
            where: { id: companyId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteCompany = async (req, res, next) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const result = await CompanyService.delete({
            where: { id: companyId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
    }
}

const CompanyController = {
    getAllCompanys,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany
}
module.exports = CompanyController
```

- [ ] **Step 4: Completar Swagger de `src/routes/catalogs/company.routes.js`**

Reemplazar el archivo completo con (mantiene los dos bloques `@openapi` de `GET` ya existentes, agrega los de `POST`/`PUT`/`DELETE`):

```js
const { Router } = require('express');
const CompanyController = require('../../controllers/catalogs/company.controller');
const { uploadSingleImage } = require('../../utils/uploadConfiguration');

const router = Router();

/**
 * @openapi
 * /companies:
 *   get:
 *     summary: Listar todas las empresas
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   ruc:
 *                     type: string
 *                   adress:
 *                     type: string
 *                   active:
 *                     type: boolean
 */
router.get('/', CompanyController.getAllCompanys);

/**
 * @openapi
 * /companies/{company_id}:
 *   get:
 *     summary: Obtener una empresa por ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de empresa codificado (hashids)
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *       404:
 *         description: Empresa no encontrada
 */
router.get('/:company_id', CompanyController.getCompany);

/**
 * @openapi
 * /companies/createCompany:
 *   post:
 *     summary: Crear una empresa
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, ruc, adress, logo]
 *             properties:
 *               name:
 *                 type: string
 *               ruc:
 *                 type: string
 *               adress:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Empresa creada
 *       400:
 *         description: No se ha subido ningún archivo de logo
 */
router.post('/createCompany', uploadSingleImage, CompanyController.createCompany);

/**
 * @openapi
 * /companies/updateCompany/{company_id}:
 *   put:
 *     summary: Actualizar una empresa
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de empresa codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               ruc:
 *                 type: string
 *               adress:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Opcional — si no se envía, el logo actual no cambia
 *     responses:
 *       200:
 *         description: Empresa actualizada
 */
router.put('/updateCompany/:company_id', uploadSingleImage, CompanyController.updateCompany);

/**
 * @openapi
 * /companies/{company_id}:
 *   delete:
 *     summary: Eliminar una empresa
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de empresa codificado (hashids)
 *     responses:
 *       200:
 *         description: Empresa eliminada
 */
router.delete('/:company_id', CompanyController.deleteCompany);


module.exports = router;
```

- [ ] **Step 5: Correr los tests nuevos y confirmar que pasan**

Run: `npm test -- tests/domain/catalogs-yachts-company-departaments/company.test.js`
Expected: PASS (todos los tests)

- [ ] **Step 6: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS, incluyendo `tests/smoke/companies.smoke.test.js` (sigue esperando `200` + array en `GET /api/companies`, sin cambios en esta task).

- [ ] **Step 7: Commit**

```bash
git add src/controllers/catalogs/company.controller.js src/routes/catalogs/company.routes.js tests/domain/catalogs-yachts-company-departaments/company.test.js
git commit -m "fix: validar archivo de logo en createCompany + retrofit AppError + tests profundos + swagger completo"
```

---

### Task 3: Retrofit + bug fix + tests + Swagger de `departaments` (6 endpoints)

**Files:**
- Modify: `src/controllers/catalogs/departaments.controller.js`
- Modify: `src/services/catalogs/departaments.services.js`
- Modify: `src/routes/catalogs/departaments.routes.js`
- Create: `tests/domain/catalogs-yachts-company-departaments/departaments.test.js`

**Interfaces:**
- `DepartamentsController.*` pasan de `(req, res)` a `(req, res, next)`.
- `DepartamentService.getDepartamentsById` se elimina (dead code, sin llamantes).
- Consume: `AppError` (`src/errors/AppError.js`), `createDepartment(name?)` de `tests/helpers/staffFixtures.js`.

**Nota de comportamiento (no se toca en esta task):** `GET /api/departaments/process/:departament_id` usa el parámetro de ruta como el `id` propio del registro `Process` (no como una FK a `departament_id`, pese al nombre del parámetro) — así lo hace `DepartamentService.getProcessById(id)` hoy. Los tests reflejan este comportamiento real, no lo que el nombre del parámetro sugiere.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/domain/catalogs-yachts-company-departaments/departaments.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment } = require('../../helpers/staffFixtures');
const Departaments = require('../../../src/models/catalogs/departament.models');
const Process = require('../../../src/models/operations/indicators/process.models');
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

describe('GET /api/departaments', () => {
    it('lists departaments with encoded id', async () => {
        const departament = await createDepartment(`Departamento List ${Date.now()}`);

        const response = await request(app)
            .get('/api/departaments')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(departament.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(departament.name);
    });
});

describe('GET /api/departaments/:departament_id', () => {
    it('returns a single departament with encoded id', async () => {
        const departament = await createDepartment(`Departamento Get ${Date.now()}`);

        const response = await request(app)
            .get(`/api/departaments/${Utils.encode(departament.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(departament.id));
        expect(response.body.name).toBe(departament.name);
    });

    it('returns 404 when the departament does not exist', async () => {
        const response = await request(app)
            .get(`/api/departaments/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Departamento no encontrado');
    });
});

describe('GET /api/departaments/process/:departament_id', () => {
    it('returns a process looked up by its own id', async () => {
        const departament = await createDepartment(`Departamento Proceso ${Date.now()}`);
        const process = await Process.create({ departamentId: departament.id, name: 'Proceso Test' });

        const response = await request(app)
            .get(`/api/departaments/process/${Utils.encode(process.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(process.id));
        expect(response.body.name).toBe('Proceso Test');
    });

    it('returns 404 when the process does not exist', async () => {
        const response = await request(app)
            .get(`/api/departaments/process/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Proceso no encontrado');
    });
});

describe('POST /api/departaments/createDepartament', () => {
    it('creates a departament', async () => {
        const name = `Nuevo Departamento ${Date.now()}`;
        const response = await request(app)
            .post('/api/departaments/createDepartament')
            .set('Authorization', `Bearer ${token}`)
            .send({ name, indicators: true });

        expect(response.status).toBe(200);
        const created = await Departaments.findOne({ where: { name } });
        expect(created).not.toBeNull();
        expect(created.indicators).toBe(true);
    });
});

describe('PUT /api/departaments/updateDepartament/:departament_id', () => {
    it('updates a departament', async () => {
        const departament = await createDepartment(`Departamento Update ${Date.now()}`);

        const response = await request(app)
            .put(`/api/departaments/updateDepartament/${Utils.encode(departament.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Departamento Actualizado' });

        expect(response.status).toBe(200);
        await departament.reload();
        expect(departament.name).toBe('Departamento Actualizado');
    });
});

describe('DELETE /api/departaments/:departament_id', () => {
    it('deletes a departament', async () => {
        const departament = await createDepartment(`Departamento Delete ${Date.now()}`);

        const response = await request(app)
            .delete(`/api/departaments/${Utils.encode(departament.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: 'resource deleted successfully' });
        const found = await Departaments.findByPk(departament.id);
        expect(found).toBeNull();
    });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- tests/domain/catalogs-yachts-company-departaments/departaments.test.js`
Expected: FAIL — los dos tests de `404` fallan (hoy responden `200` + `null`).

- [ ] **Step 3: Eliminar el dead code de `src/services/catalogs/departaments.services.js`**

Reemplazar el archivo completo con (idéntico al actual, sin el método `getDepartamentsById`, que usaba `Op.in` sin `Op` importado y no tenía ningún llamante):

```js
const Departaments = require('../../models/catalogs/departament.models');
const Process = require('../../models/operations/indicators/process.models');

class DepartamentService {
    static async getAll() {
        try {
            const result = await Departaments.findAll({
                attributes: ['id','name','indicators'],
                order:[['name', 'ASC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getDepartamentById(id) {
        try {
            const result = await Departaments.findOne({
                where: { id },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getProcessById(id) {
        try {
            const result = await Process.findOne({
                where: { id },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createDepartament(departament) {
        try {
            const result = await Departaments.create(departament);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateDepartament(departament, id) {
        try {
            const result = await Departaments.update(departament, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(departamentId) {
        try {
            const result = await Departaments.destroy({
                where: { id: departamentId }
            });
            if(result){
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  DepartamentService;
```

- [ ] **Step 4: Reescribir `src/controllers/catalogs/departaments.controller.js`**

Reemplazar el archivo completo con:

```js
const DepartamentService = require('../../services/catalogs/departaments.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getDepartaments = async (req, res, next) => {
    try {
        const result = await DepartamentService.getAll();
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

const getDepartament = async (req, res, next) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const result = await DepartamentService.getDepartamentById(departamentId);
        if (!result) {
            throw new AppError('Departamento no encontrado', 404);
        }
        result.id = Utils.encode(result.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getProcessById = async (req, res, next) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const result = await DepartamentService.getProcessById(departamentId);
        if (!result) {
            throw new AppError('Proceso no encontrado', 404);
        }
        result.id = Utils.encode(result.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createDepartament = async (req, res, next) => {
    try {
        const departament = req.body;
        const result = await DepartamentService.createDepartament(departament);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateDepartament = async (req, res, next) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const departament = req.body;
        delete departament.id
        await DepartamentService.updateDepartament(departament, {
            where: { id: departamentId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteDepartament = async (req, res, next) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const result = await DepartamentService.delete(departamentId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}


const DepartamentsController = {
    getDepartaments,
    getDepartament,
    getProcessById,
    createDepartament,
    updateDepartament,
    deleteDepartament
}

module.exports = DepartamentsController
```

- [ ] **Step 5: Agregar Swagger a `src/routes/catalogs/departaments.routes.js`**

Reemplazar el archivo completo con:

```js
const { Router } = require('express');
const DepartamentsController = require('../../controllers/catalogs/departaments.controller');

const router = Router();

/**
 * @openapi
 * /departaments:
 *   get:
 *     summary: Listar todos los departamentos
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de departamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de departamento codificado (hashids)
 *                   name:
 *                     type: string
 *                   indicators:
 *                     type: boolean
 */
router.get('/', DepartamentsController.getDepartaments);

/**
 * @openapi
 * /departaments/{departament_id}:
 *   get:
 *     summary: Obtener un departamento por ID
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departament_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de departamento codificado (hashids)
 *     responses:
 *       200:
 *         description: Departamento encontrado
 *       404:
 *         description: Departamento no encontrado
 */
router.get('/:departament_id', DepartamentsController.getDepartament);

/**
 * @openapi
 * /departaments/process/{departament_id}:
 *   get:
 *     summary: Obtener un proceso por su propio ID
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departament_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de proceso codificado (hashids) — pese al nombre del parámetro, no es el ID del departamento
 *     responses:
 *       200:
 *         description: Proceso encontrado
 *       404:
 *         description: Proceso no encontrado
 */
router.get('/process/:departament_id', DepartamentsController.getProcessById);

/**
 * @openapi
 * /departaments/createDepartament:
 *   post:
 *     summary: Crear un departamento
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               indicators:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Departamento creado
 *       500:
 *         description: Error inesperado
 */
router.post('/createDepartament', DepartamentsController.createDepartament);

/**
 * @openapi
 * /departaments/updateDepartament/{departament_id}:
 *   put:
 *     summary: Actualizar un departamento
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departament_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               indicators:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Departamento actualizado
 */
router.put('/updateDepartament/:departament_id', DepartamentsController.updateDepartament);

/**
 * @openapi
 * /departaments/{departament_id}:
 *   delete:
 *     summary: Eliminar un departamento
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departament_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Departamento eliminado
 */
router.delete('/:departament_id', DepartamentsController.deleteDepartament);


module.exports = router;
```

- [ ] **Step 6: Correr los tests nuevos y confirmar que pasan**

Run: `npm test -- tests/domain/catalogs-yachts-company-departaments/departaments.test.js`
Expected: PASS (todos los tests)

- [ ] **Step 7: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS — incluyendo Task 1 y Task 2 de este mismo plan, y todo lo de Fase 0/1/2 anterior.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/catalogs/departaments.controller.js src/services/catalogs/departaments.services.js src/routes/catalogs/departaments.routes.js tests/domain/catalogs-yachts-company-departaments/departaments.test.js
git commit -m "fix: eliminar dead code roto en departaments.services + retrofit AppError + tests profundos + swagger"
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
por dominio en Fase 2. Dominios ya retrofiteados: `auth`, `staff`, `users`.
```

por:

```
El retrofit de los controllers existentes al patrón nuevo se hace dominio
por dominio en Fase 2. Dominios ya retrofiteados: `auth`, `staff`, `users`,
`yachts`, `company`, `departaments`.
```

- [ ] **Step 2: Correr la suite completa una última vez**

Run: `npm test`
Expected: todos los tests PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/CONVENTIONS.md
git commit -m "docs: actualizar CONVENTIONS.md con dominios yachts/company/departaments retrofiteados"
```
