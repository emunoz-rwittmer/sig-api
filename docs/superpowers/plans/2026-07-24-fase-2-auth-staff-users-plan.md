# Fase 2 — Dominio Auth/Staff/Users: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofitear los 23 endpoints de `auth`/`staff`/`users` al patrón `AppError`/`errorHandler` con status codes precisos, corregir 3 bugs reales encontrados durante el diseño (JWT `H5512`, `forgotPassword`/`forgotPasswordStaff` sin respuesta, `getUserById` con atributos incorrectos), agregar tests profundos por endpoint, y completar la documentación Swagger del dominio.

**Architecture:** Cambios dentro de los 3 controllers del dominio (`auth`, `staff`, `users`), 2 archivos de servicio tocados solo para los bug fixes puntuales (`users.services.js` para `getUserById`), y `auth.middleware.js` solo para el fix de `H5512`. Ningún modelo, ruta, ni forma de respuesta **exitosa** cambia. Los tests nuevos viven en `tests/domain/auth-staff-users/`, reusando `tests/helpers/testApp.js` y `tests/helpers/auth.js` de Fase 0, más un helper nuevo `tests/helpers/staffFixtures.js` para las dependencias de FK de `staff` (departamento, posición, empresa+yate).

**Tech Stack:** Node.js, Express 4, Sequelize 6 (MySQL), Jest + Supertest, swagger-jsdoc.

## Global Constraints

- Branch: `refactor/fase-2-auth-staff-users`, creada desde `trunk`.
- Cambia la forma de respuesta de **error** en los 23 endpoints (de string plano a `{ "error": { "message", "code" } }`) y varios status codes (ver tabla de la Sección 1 del spec) — **confirmado y coordinado por el usuario con el frontend, no requiere aprobación adicional.**
- La forma de respuesta **exitosa** de los 23 endpoints no cambia.
- Ningún cambio de ruta (path, método HTTP, nombre de parámetro).
- `docs/superpowers/specs/2026-07-24-fase-2-auth-staff-users-design.md` es la fuente de verdad del alcance — leerlo si algo en este plan es ambiguo.
- CommonJS (`require`/`module.exports`) en todo el código — sin ESM.
- Windows + Git Bash / PowerShell.
- Cada task termina con `npm test` en verde antes de commitear.
- Los `console.log`/`console.error` de debug dentro de bloques `catch` de los 3 controllers se eliminan al retrofitear cada función (quedan obsoletos: antes servían para ver el error ya que la respuesta no lo exponía con detalle; ahora `AppError`/`errorHandler` expone `message`/`code` estructurados, y los tests van a ejercitar deliberadamente rutas de error — un `console.log` ahí ensuciaría el output de test). Esto aplica dentro de cada función que ya se está tocando por el retrofit, no es una pasada aparte.

---

### Task 1: Fix del bug `H5512` → `HS512` en `auth.middleware.js`

**Files:**
- Modify: `src/middlewares/auth.middleware.js`
- Test: `tests/unit/middlewares/auth.middleware.test.js`

**Interfaces:**
- No cambia ninguna firma exportada (`verifyToken`, `isAdmin`, `isAdminOfSurveys` de `authJwt`).

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/unit/middlewares/auth.middleware.test.js`:

```js
require('dotenv').config({ path: '.env.test' });
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../../../src/middlewares/auth.middleware');

function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

describe('auth.middleware verifyToken', () => {
    it('accepts a token signed with HS512 without falling back to refresh', async () => {
        const token = jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_SECRET, {
            expiresIn: '10h',
            algorithm: 'HS512',
        });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        let nextCalled = false;

        await verifyToken(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(true);
        expect(req.userRol).toBe('admin');
        expect(res.statusCode).toBeNull();
    });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npm test -- tests/unit/middlewares/auth.middleware.test.js`
Expected: FAIL — `nextCalled` es `false` porque `jwt.verify(token, secret, { algorithm: 'H5512' })` no reconoce `'H5512'` como algoritmo válido, lanza, y el middleware cae al flujo de refresh token (que a su vez falla porque no hay `sessionData` en Mongo para este test, terminando en `res.status(498)`).

- [ ] **Step 3: Corregir `src/middlewares/auth.middleware.js`**

Reemplazar las 2 ocurrencias de:

```js
{ algorithm: 'H5512' }
```

por:

```js
{ algorithm: 'HS512' }
```

(línea 16, dentro de `verifyToken`'s primer `jwt.verify`; línea 29, dentro del `jwt.verify` de `refreshDecoded`). No tocar ninguna otra línea del archivo.

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npm test -- tests/unit/middlewares/auth.middleware.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Correr la suite completa**

Run: `npm test`
Expected: todos los tests existentes de Fase 0/1 siguen PASS (el fix no cambia `jwt.sign`, solo `jwt.verify` — los tokens ya se firmaban con `'HS512'` en `src/utils/tokens.js`, así que login/smoke tests que ya pasaban un token válido siguen funcionando igual o mejor).

- [ ] **Step 6: Commit**

```bash
git add src/middlewares/auth.middleware.js tests/unit/middlewares/auth.middleware.test.js
git commit -m "fix: corregir typo H5512 -> HS512 en verificación de JWT"
```

---

### Task 2: Retrofit + bug fixes + tests + Swagger del dominio `auth` (6 endpoints)

**Files:**
- Modify: `src/controllers/catalogs/auth.controller.js`
- Modify: `src/routes/catalogs/auth.routes.js`
- Modify: `tests/smoke/auth.smoke.test.js`
- Create: `tests/domain/auth-staff-users/auth.test.js`

**Interfaces:**
- `AuthController.{login,upgradePassword,forgotPassword,loginStaffs,forgotPasswordStaff,upgradePasswordStaff}` pasan de `(req, res)` a `(req, res, next)` — Express siempre pasa 3 argumentos a un route handler, así que las rutas no cambian.
- Consume: `AppError` (`src/errors/AppError.js`, Fase 0).

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/domain/auth-staff-users/auth.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createTestUser, TEST_USER } = require('../../helpers/auth');
const Roles = require('../../../src/models/catalogs/roles.models');
const Staff = require('../../../src/models/catalogs/staff.models');
const Departaments = require('../../../src/models/catalogs/departament.models');
const Positions = require('../../../src/models/catalogs/positions.models');

jest.mock('../../../src/mails/mailer', () => ({
    sendEmail: jest.fn(),
    sendEmailPasswordStaff: jest.fn(),
}));

let app;

beforeAll(async () => {
    app = await bootTestApp();
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await createTestUser();
    });

    it('returns 400 when email is missing', async () => {
        const response = await request(app).post('/api/auth/login').send({ password: 'x' });
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('Not email provided');
    });

    it('returns 401 for invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrong-password' });
        expect(response.status).toBe(401);
        expect(response.body.error).toEqual({
            message: 'Usuario o contraseña incorrectas',
            code: 'AppError',
        });
    });

    it('returns 403 when the user is disabled', async () => {
        const role = await Roles.create({ name: 'disabled-role' });
        const Users = require('../../../src/models/catalogs/user.models');
        await Users.create({
            firstName: 'Disabled',
            lastName: 'User',
            email: 'disabled@example.com',
            password: 'Sup3rSecret!',
            roleId: role.id,
            active: false,
        });

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'disabled@example.com', password: 'Sup3rSecret!' });

        expect(response.status).toBe(403);
        expect(response.body.error.message).toBe('Usuario deshabilitado');
    });
});

describe('PUT /api/auth/upgradePassword/:user_id', () => {
    it('updates the password and it can be used to log in', async () => {
        const Users = require('../../../src/models/catalogs/user.models');
        const Utils = require('../../../src/utils/Utils');
        const user = await Users.findOne({ where: { email: TEST_USER.email } });

        const response = await request(app)
            .put(`/api/auth/upgradePassword/${Utils.encode(user.id)}`)
            .send({ password: 'NewPassword1!' });

        expect(response.status).toBe(200);

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'NewPassword1!' });
        expect(loginResponse.status).toBe(200);
    });
});

describe('PUT /api/auth/forgotPassword', () => {
    it('returns 404 when the email does not exist', async () => {
        const response = await request(app)
            .put('/api/auth/forgotPassword')
            .send({ email: 'nobody@example.com' });

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Usuario no encontrado');
    });

    it('resets the password for an existing email and responds 200', async () => {
        const response = await request(app)
            .put('/api/auth/forgotPassword')
            .send({ email: TEST_USER.email });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: 'password updated successfully' });
    });
});

describe('POST /api/auth/login_staffs', () => {
    let staff;

    beforeEach(async () => {
        const departament = await Departaments.create({ name: 'Operaciones' });
        const position = await Positions.create({ name: 'Analista' });
        staff = await Staff.create({
            firstName: 'Staff',
            lastName: 'Test',
            email: 'staff-login@example.com',
            cellPhone: '0999999999',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });
    });

    it('logs in a staff member and returns companiIds/isTiptop', async () => {
        const response = await request(app)
            .post('/api/auth/login_staffs')
            .send({ email: 'staff-login@example.com', password: 'Sup3rSecret!' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.companiIds).toEqual([]);
        expect(response.body.isTiptop).toBe(false);
    });

    it('returns 401 for invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login_staffs')
            .send({ email: 'staff-login@example.com', password: 'wrong' });
        expect(response.status).toBe(401);
    });

    it('returns 403 when the staff member is disabled', async () => {
        await staff.update({ active: false });
        const response = await request(app)
            .post('/api/auth/login_staffs')
            .send({ email: 'staff-login@example.com', password: 'Sup3rSecret!' });
        expect(response.status).toBe(403);
    });
});

describe('PUT /api/auth/forgot_password_staffs', () => {
    it('returns 404 when the staff email does not exist', async () => {
        const response = await request(app)
            .put('/api/auth/forgot_password_staffs')
            .send({ email: 'nobody-staff@example.com' });

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Usuario no encontrado');
    });

    it('resets the password for an existing staff email and responds 200', async () => {
        const departament = await Departaments.create({ name: 'RRHH' });
        const position = await Positions.create({ name: 'Coordinador' });
        await Staff.create({
            firstName: 'Staff',
            lastName: 'Forgot',
            email: 'staff-forgot@example.com',
            cellPhone: '0988888888',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
        });

        const response = await request(app)
            .put('/api/auth/forgot_password_staffs')
            .send({ email: 'staff-forgot@example.com' });

        expect(response.status).toBe(200);
    });
});

describe('PUT /api/auth/upgrade_password_staffs/:staff_id', () => {
    it('updates the staff password and it can be used to log in', async () => {
        const Utils = require('../../../src/utils/Utils');
        const departament = await Departaments.create({ name: 'Bar' });
        const position = await Positions.create({ name: 'Barman' });
        const staff = await Staff.create({
            firstName: 'Staff',
            lastName: 'Upgrade',
            email: 'staff-upgrade@example.com',
            cellPhone: '0977777777',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
        });

        const response = await request(app)
            .put(`/api/auth/upgrade_password_staffs/${Utils.encode(staff.id)}`)
            .send({ password: 'NewPassword1!' });

        expect(response.status).toBe(200);

        const loginResponse = await request(app)
            .post('/api/auth/login_staffs')
            .send({ email: 'staff-upgrade@example.com', password: 'NewPassword1!' });
        expect(loginResponse.status).toBe(200);
    });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- tests/domain/auth-staff-users/auth.test.js`
Expected: FAIL — todas las aserciones de `response.body.error.*` fallan porque hoy la respuesta de error es un string plano (`response.body` sería el string del mensaje, no un objeto `{error:{...}}`), y las aserciones de status 401/403/404 fallan porque hoy todo responde 400.

- [ ] **Step 3: Reescribir `src/controllers/catalogs/auth.controller.js`**

Reemplazar el archivo completo con:

```js
const AuthService = require('../../services/catalogs/auth.services');
const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const Tokens = require('../../utils/tokens');
const tokenModel = require('../../models/mongoModels/Token.models');
const bcrypt = require('bcrypt');
const { sendEmail, sendEmailPasswordStaff } = require('../../mails/mailer');
const Staffervice = require('../../services/catalogs/staff.services');
const AppError = require('../../errors/AppError');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            throw new AppError('Not email provided', 400);
        }

        if (!password) {
            throw new AppError('Not password provided', 400);
        }

        const result = await AuthService.login({ email, password });

        if (!result.isValid) {
            throw new AppError('Usuario o contraseña incorrectas', 401);
        }

        if (!result.user.active) {
            throw new AppError('Usuario deshabilitado', 403);
        }

        const { id, firstName, lastName } = result.user;
        const sessioId = Tokens.getSessionRandom();
        const userData = { id, firstName, lastName };

        userData.id = Utils.encode(userData.id);
        userData.rol = result.user.user_rol?.name;
        userData.sessionId = sessioId;

        const token = await Tokens.generateAccessToken(userData);
        const refreshToken = await Tokens.generateRefreshToken(userData);

        userData.token = token;
        userData.changePassword = result.user.changePassword

        const newToken = new tokenModel({
            user: firstName + " " + lastName,
            userId: Utils.encode(id),
            sessionId: sessioId,
            refreshtoken: refreshToken
        });
        newToken.save();
        res.status(200).json(userData);

    } catch (error) {
        next(error);
    }
}

const upgradePassword = async (req, res, next) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const data = {
            id: userId,
            password: bcrypt.hashSync(req.body.password, 10),
            changePassword: false
        };

        await AuthService.userUpgradePassword(data);

        res.status(200).json({ data: 'password updated successfully' });
    } catch (error) {
        next(error);
    }
}

const forgotPassword = async (req, res, next) => {
    try {
        const useEmail = req.body.email;
        const passwordGenerate = Tokens.getPasswordRandom();
        const result = await UserService.getUserByEmail(useEmail);

        if (!result) {
            throw new AppError('Usuario no encontrado', 404);
        }

        const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);
        const action = "forgot passowrd"
        sendEmail(result, passwordGenerate, action);
        await UserService.updateUser({
            password: passwordGenerated, changePassword: true
        },
            { where: { id: result.id } }
        );

        res.status(200).json({ data: "password updated successfully" });
    } catch (error) {
        next(error);
    }
}

const loginStaffs = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            throw new AppError('Not email provided', 400);
        }
        if (!password) {
            throw new AppError('Not password provided', 400);
        }
        const result = await AuthService.loginStaffs({ email, password });

        if (!result.isValid) {
            throw new AppError('Usuario o contraseña incorrectas', 401);
        }

        if (!result.user.active) {
            throw new AppError('Usuario deshabilitado', 403);
        }

        const { id, firstName, lastName } = result.user;
        const userData = { id, firstName, lastName };
        userData.id = Utils.encode(userData.id);
        userData.rol = result.user.rol?.name

        const sessioId = Tokens.getSessionRandom();
        const token = await Tokens.generateAccessToken(userData);
        const refreshToken = await Tokens.generateRefreshToken(userData);

        userData.token = token;
        userData.changePassword = result.user.changePassword
        userData.isTiptop = result.user.companies.some(x => x.companyId === 5); //es tiptop
        userData.companiIds = result.user.companies.map(company => (company.companyId = Utils.encode(company.companyId)));

        const newToken = new tokenModel({
            user: firstName + " " + lastName,
            userId: Utils.encode(id),
            sessionId: sessioId,
            refreshtoken: refreshToken
        });
        newToken.save();
        res.status(200).json(userData);

    } catch (error) {
        next(error);
    }
}

const forgotPasswordStaff = async (req, res, next) => {
    try {
        const useEmail = req.body.email;
        const passwordGenerate = Tokens.getPasswordRandom();
        const staff = await Staffervice.getStaffByEmail(useEmail);

        if (!staff) {
            throw new AppError('Usuario no encontrado', 404);
        }

        const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);
        sendEmailPasswordStaff(staff, passwordGenerate);
        const data = {
            id: staff.id,
            password: passwordGenerated,
            changePassword: true
        };
        await AuthService.staffUpgradePassword(data);
        res.status(200).json({ data: "password updated successfully" });
    } catch (error) {
        next(error);
    }
}


const upgradePasswordStaff = async (req, res, next) => {
    try {
        const userId = Utils.decode(req.params.staff_id);
        const data = {
            id: userId,
            password: bcrypt.hashSync(req.body.password, 10),
            changePassword: false
        };

        await AuthService.staffUpgradePassword(data);

        res.status(200).json({ data: 'password updated successfully' });
    } catch (error) {
        next(error);
    }
}


const AuthController = {
    login,
    upgradePassword,
    forgotPassword,
    loginStaffs,
    forgotPasswordStaff,
    upgradePasswordStaff
}

module.exports = AuthController
```

- [ ] **Step 4: Actualizar el Swagger de `src/routes/catalogs/auth.routes.js`**

Reemplazar el archivo completo con:

```js
const { Router } = require('express');
const AuthController = require('../../controllers/catalogs/auth.controller');

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesion como usuario administrativo
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID de usuario codificado (hashids)
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 rol:
 *                   type: string
 *                 token:
 *                   type: string
 *                 changePassword:
 *                   type: boolean
 *       400:
 *         description: Falta email o password
 *       401:
 *         description: Credenciales invalidas
 *       403:
 *         description: Usuario deshabilitado
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /auth/upgradePassword/{user_id}:
 *   put:
 *     summary: Cambiar la contrasena de un usuario administrativo
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de usuario codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contrasena actualizada
 *       500:
 *         description: Error inesperado
 */
router.put('/upgradePassword/:user_id', AuthController.upgradePassword);

/**
 * @openapi
 * /auth/forgotPassword:
 *   put:
 *     summary: Generar y enviar por correo una nueva contrasena de usuario administrativo
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Contrasena restablecida y enviada por correo
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/forgotPassword', AuthController.forgotPassword)

//staffs
/**
 * @openapi
 * /auth/login_staffs:
 *   post:
 *     summary: Iniciar sesion como personal (staff)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 rol:
 *                   type: string
 *                 token:
 *                   type: string
 *                 changePassword:
 *                   type: boolean
 *                 isTiptop:
 *                   type: boolean
 *                 companiIds:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Falta email o password
 *       401:
 *         description: Credenciales invalidas
 *       403:
 *         description: Usuario deshabilitado
 */
router.post('/login_staffs', AuthController.loginStaffs);

/**
 * @openapi
 * /auth/forgot_password_staffs:
 *   put:
 *     summary: Generar y enviar por correo una nueva contrasena de personal
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Contrasena restablecida y enviada por correo
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/forgot_password_staffs', AuthController.forgotPasswordStaff)

/**
 * @openapi
 * /auth/upgrade_password_staffs/{staff_id}:
 *   put:
 *     summary: Cambiar la contrasena de un miembro del personal
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de personal codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contrasena actualizada
 *       500:
 *         description: Error inesperado
 */
router.put('/upgrade_password_staffs/:staff_id', AuthController.upgradePasswordStaff);


module.exports = router;
```

- [ ] **Step 5: Actualizar `tests/smoke/auth.smoke.test.js`**

Reemplazar la aserción de status del segundo test:

```js
    it('rejects an invalid password', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrong-password' });

        expect(response.status).toBe(400);
    });
```

por:

```js
    it('rejects an invalid password', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrong-password' });

        expect(response.status).toBe(401);
    });
```

No tocar ninguna otra línea del archivo.

- [ ] **Step 6: Correr los tests nuevos y confirmar que pasan**

Run: `npm test -- tests/domain/auth-staff-users/auth.test.js tests/smoke/auth.smoke.test.js`
Expected: PASS (todos los tests de ambos archivos)

- [ ] **Step 7: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS, incluyendo el resto de smoke tests de Fase 0 (que hacen login real y siguen esperando 200 en el caso feliz).

- [ ] **Step 8: Commit**

```bash
git add src/controllers/catalogs/auth.controller.js src/routes/catalogs/auth.routes.js tests/smoke/auth.smoke.test.js tests/domain/auth-staff-users/auth.test.js
git commit -m "feat: retrofit AppError + fix bugs + tests profundos + swagger completo en dominio auth"
```

---

### Task 3: Retrofit + tests + Swagger de `staff` CRUD (8 endpoints)

**Files:**
- Modify: `src/controllers/catalogs/staff.controller.js`
- Modify: `src/routes/catalogs/staff.routes.js`
- Create: `tests/helpers/staffFixtures.js`
- Create: `tests/domain/auth-staff-users/staff-crud.test.js`

**Interfaces:**
- Produces: `tests/helpers/staffFixtures.js` exporta `{ createDepartment(name?), createPosition(name?), createCompanyWithYacht(companyName?, yachtName?) }` — cada uno devuelve la instancia Sequelize creada (o `{ company, yacht }` para el tercero). Reutilizado también por Task 4.
- `StaffController.*` pasan de `(req, res)` a `(req, res, next)`.

- [ ] **Step 1: Crear `tests/helpers/staffFixtures.js`**

```js
const Departaments = require('../../src/models/catalogs/departament.models');
const Positions = require('../../src/models/catalogs/positions.models');
const Company = require('../../src/models/catalogs/company.models');
const Yacht = require('../../src/models/catalogs/yacht.models');

async function createDepartment(name = 'Operaciones') {
    return Departaments.create({ name });
}

async function createPosition(name = 'Analista') {
    return Positions.create({ name });
}

async function createCompanyWithYacht(companyName = 'Test Company', yachtName = 'Test Yacht') {
    const company = await Company.create({
        name: companyName,
        ruc: '1234567890001',
        logo: '/uploads/companies/test-logo.png',
        adress: 'Av. Test 123',
    });
    const yacht = await Yacht.create({
        companyId: company.id,
        name: yachtName,
        email: `${yachtName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        code: 'YT-001',
        color: '#FFFFFF',
    });
    return { company, yacht };
}

module.exports = { createDepartment, createPosition, createCompanyWithYacht };
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `tests/domain/auth-staff-users/staff-crud.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const StaffCompany = require('../../../src/models/catalogs/staffCompany.models');
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

async function createBasicStaff(overrides = {}) {
    const departament = await createDepartment();
    const position = await createPosition();
    return Staff.create({
        firstName: 'Ana',
        lastName: 'Gomez',
        email: `staff-${Date.now()}-${Math.random()}@example.com`,
        cellPhone: '0999999999',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
        ...overrides,
    });
}

describe('GET /api/staffs', () => {
    it('lists staff with encoded ids and department/position names', async () => {
        const staff = await createBasicStaff({ firstName: 'Beatriz' });

        const response = await request(app)
            .get('/api/staffs')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(staff.id));
        expect(found).toBeDefined();
        expect(found.firstName).toBe('Beatriz');
        expect(found.companies).toEqual([]);
    });
});

describe('GET /api/staffs/:staff_id', () => {
    it('returns a single staff member with encoded id', async () => {
        const staff = await createBasicStaff({ firstName: 'Carlos' });

        const response = await request(app)
            .get(`/api/staffs/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(staff.id));
        expect(response.body.firstName).toBe('Carlos');
    });
});

describe('GET /api/staffs/:staff_id/companies', () => {
    it('returns companies with yacht data for the staff member', async () => {
        const staff = await createBasicStaff();
        const { company, yacht } = await createCompanyWithYacht();
        await StaffCompany.create({ staffId: staff.id, companyId: company.id });

        const response = await request(app)
            .get(`/api/staffs/${Utils.encode(staff.id)}/companies`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].company.yacht.id).toBe(Utils.encode(yacht.id));
    });
});

describe('POST /api/staffs/createStaff', () => {
    it('creates a staff member with decoded FK ids', async () => {
        const departament = await createDepartment();
        const position = await createPosition();

        const response = await request(app)
            .post('/api/staffs/createStaff')
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'Diego',
                lastName: 'Perez',
                email: 'diego@example.com',
                cellPhone: '0988888888',
                contractType: 'Fijo',
                departamentId: Utils.encode(departament.id),
                positionId: Utils.encode(position.id),
            });

        expect(response.status).toBe(200);
        const created = await Staff.findOne({ where: { email: 'diego@example.com' } });
        expect(created).not.toBeNull();
        expect(created.departamentId).toBe(departament.id);
    });
});

describe('PUT /api/staffs/updateStaff/:staff_id', () => {
    it('updates a staff member', async () => {
        const staff = await createBasicStaff();
        const departament = await createDepartment('Nuevo Departamento');
        const position = await createPosition('Nueva Posicion');

        const response = await request(app)
            .put(`/api/staffs/updateStaff/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'Ana Actualizada',
                departamentId: Utils.encode(departament.id),
                positionId: Utils.encode(position.id),
            });

        expect(response.status).toBe(200);
        await staff.reload();
        expect(staff.firstName).toBe('Ana Actualizada');
        expect(staff.departamentId).toBe(departament.id);
    });
});

describe('DELETE /api/staffs/:staff_id', () => {
    it('deletes a staff member', async () => {
        const staff = await createBasicStaff();

        const response = await request(app)
            .delete(`/api/staffs/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Staff.findByPk(staff.id);
        expect(found).toBeNull();
    });
});

describe('PUT /api/staffs/:staff_id/uploadImageFile', () => {
    it('returns 400 when no file is uploaded', async () => {
        const staff = await createBasicStaff();

        const response = await request(app)
            .put(`/api/staffs/${Utils.encode(staff.id)}/uploadImageFile`)
            .set('Authorization', `Bearer ${token}`)
            .field('type', 'photo');

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No se ha subido ningún archivo');
    });
});

describe('PUT /api/staffs/update/documentation/:staff_id', () => {
    it('returns 400 when no file is uploaded', async () => {
        const staff = await createBasicStaff();

        const response = await request(app)
            .put(`/api/staffs/update/documentation/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .field('id', '1');

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No se ha subido ningún archivo');
    });
});
```

- [ ] **Step 3: Correr los tests y confirmar que fallan**

Run: `npm test -- tests/domain/auth-staff-users/staff-crud.test.js`
Expected: FAIL — las aserciones de `response.body.error.message` fallan (hoy el body de error es un string plano), y las de status 400 en los dos tests de upload fallan del mismo modo aunque el status ya sea 400 hoy (el body no tiene la forma `{error:{message}}`).

- [ ] **Step 4: Reescribir `src/controllers/catalogs/staff.controller.js`**

Reemplazar el archivo completo con (idéntico al actual salvo: agregar `const AppError = require('../../errors/AppError');`, cada función gana el parámetro `next`, cada `catch` pasa de `res.status(400).json(error.message)`/`console.log(error); res.status(400).json(error.message)` a `next(error)`, y los dos `res.status(400).json({ message: '...' })` explícitos de `uploadImage`/`uploadStaffDocumentation` pasan a `throw new AppError('...', 400)`):

```js
const StaffService = require('../../services/catalogs/staff.services');
const Utils = require('../../utils/Utils');
const Tokens = require('../../utils/tokens');
const fs = require('fs');
const path = require('path');
const AppError = require('../../errors/AppError');

const getAllStaffs = async (req, res, next) => {
    try {
        const result = await StaffService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.departamentId = Utils.encode(x.dataValues.departamentId);
                x.dataValues.positionId = Utils.encode(x.dataValues.positionId);
                x.dataValues.roleId = Utils.encode(x.dataValues.roleId);
                x.dataValues.companies.map(com => {
                    com.dataValues.companyId = Utils.encode(com.dataValues.companyId);
                })
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getStaff = async (req, res, next) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const result = await StaffService.getStaffById(staffId);
        if (result instanceof Object) {
            result.dataValues.id = Utils.encode(result.dataValues.id);
            if (result.dataValues.roleId) result.dataValues.roleId = Utils.encode(result.dataValues.roleId);
            result.dataValues.departamentId = Utils.encode(result.dataValues.departamentId);
            result.dataValues.positionId = Utils.encode(result.dataValues.positionId);
            result.companies = result.companies.map(x => (
                x.dataValues.companyId = Utils.encode(x.dataValues.companyId)
            ))
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getStaffCompanies = async (req, res, next) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const result = await StaffService.getStaffCompanies(staffId);
        const currentPlain = result.map(r => r.get({ plain: true }));

        if (currentPlain instanceof Array) {
            currentPlain.map((x) => {
                x.id = Utils.encode(x.id);
                x.company.yacht.id = Utils.encode(x.company.yacht.id);
            });
        }
        res.status(200).json(currentPlain);
    } catch (error) {
        next(error);
    }
}

const createStaff = async (req, res, next) => {
    try {
        const staff = req.body;
        const passwordGenerate = Tokens.getPasswordRandom();
        staff.roleId = staff.roleId ? Utils.decode(staff.roleId) : null;
        staff.departamentId = Utils.decode(req.body.departamentId);
        staff.positionId = Utils.decode(req.body.positionId);
        if (staff.companyId?.length) staff.companyId = staff.companyId.map(x => Utils.decode(x));
        staff.password = passwordGenerate
        await StaffService.createStaff(staff);
        res.status(200).json({ data: 'resource created successfully' });

    } catch (error) {
        next(error);
    }
}

const updateStaff = async (req, res, next) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const staff = req.body;
        staff.id = staffId;
        staff.roleId = staff.roleId ? Utils.decode(staff.roleId) : null;
        staff.departamentId = Utils.decode(req.body.departamentId);
        staff.positionId = Utils.decode(req.body.positionId);
        if (staff.companyId?.length) staff.companyId = staff.companyId.map(x => Utils.decode(x));
        await StaffService.updateStaff(staff, staffId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteStaff = async (req, res, next) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const result = await StaffService.delete(staffId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}

const getEvaluators = async (req, res, next) => {
    try {
        const { search } = req.query;
        const searchArray = search
            ? search.split(',')
            : [];

        const decodedArray = searchArray.map(item =>
            Utils.decode(item)
        );

        const result = await StaffService.getEvaluators(decodedArray);
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

const getEvaluatorsByFilters = async (req, res, next) => {
    try {
        const { search } = req.query;
        const searchArray = search
            ? search.split(',')
            : [];

        const decodedArray = searchArray.map(item =>
            Utils.decode(item)
        );
        const companyId = Utils.decode(req.query.companyId) || null;
        const departamentId = req.query.departamentId
        const positionId = Utils.decode(req.query.positionId);

        const result = await StaffService.getEvaluatorsByFilters(decodedArray, companyId, departamentId, positionId);
        result.map((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getEvaluateds = async (req, res, next) => {
    try {
        const { search } = req.query;
        const searchArray = search
            ? search.split(',')
            : [];

        const decodedArray = searchArray.map(item =>
            Utils.decode(item)
        );

        const result = await StaffService.getEvaluateds(decodedArray);
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

const getEvaluatedsByFilters = async (req, res, next) => {
    try {
        const { search } = req.query;
        const searchArray = search
            ? search.split(',')
            : [];

        const decodedArray = searchArray.map(item =>
            Utils.decode(item)
        );

        const companyId = Utils.decode(req.query.companyId) || null;
        const result = await StaffService.getEvaluatedsByFilters(decodedArray, companyId);
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

const uploadImage = async (req, res, next) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const file = req.file;

        if (!file) {
            throw new AppError('No se ha subido ningún archivo', 400);
        }

        const staff = await StaffService.getStaffById(staffId);
        const staffFullName = `${staff.dataValues.firstName}_${staff.dataValues.lastName}`.replace(/\s+/g, '_');
        const staffDir = path.join(__dirname, '../../../uploads/staffs', staffFullName);

        if (!fs.existsSync(staffDir)) {
            fs.mkdirSync(staffDir, { recursive: true });
        }

        const { type } = req.body;
        if (!type) {
            throw new AppError('El campo "type" es requerido', 400);
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `${type}-${Date.now()}${fileExtension}`.replace(/\s+/g, '_');
        const newFilePath = path.join(staffDir, fileName);

        if (file.path && file.path !== newFilePath) {
            fs.renameSync(file.path, newFilePath);
        }

        const relativePath = path.relative(path.join(__dirname, '../../../'), newFilePath).replace(/\\/g, '/');
        const dataToUpdate = {
            [type]: `/${relativePath}`
        };

        await StaffService.uploadImage(dataToUpdate, staffId);

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const uploadStaffDocumentation = async (req, res, next) => {
    try {
        const staffId = Utils.decode(req.params.staff_id);
        const document = req.body;
        const file = req.file;

        if (!file) {
            throw new AppError('No se ha subido ningún archivo', 400);
        }

        const staff = await StaffService.getStaffById(staffId);
        const staffFullName = `${staff.dataValues.firstName}_${staff.dataValues.lastName}`
            .replace(/\s+/g, '_');

        const staffDir = path.join(__dirname, '../../../uploads/staffs', staffFullName, 'documentation');

        if (!fs.existsSync(staffDir)) {
            fs.mkdirSync(staffDir, { recursive: true });
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `documentation-${Date.now()}-${document.id}${fileExtension}`
            .replace(/\s+/g, '_');

        const newFilePath = path.join(staffDir, fileName);

        if (file.path && file.path !== newFilePath) {
            fs.renameSync(file.path, newFilePath);
        }

        const relativePath = path
            .relative(path.join(__dirname, '../../../'), newFilePath)
            .replace(/\\/g, '/');

        document.file = `/${relativePath}`;
        document.fileName = file.originalname;
        document.fileSize = file.size;

        await StaffService.uploadStaffDocumentation(document);

        res.status(200).json({ data: 'Documentación guardada exitosamente' });

    } catch (error) {
        next(error);
    }
};

const StaffController = {
    getAllStaffs,
    getStaff,
    getStaffCompanies,
    getEvaluators,
    getEvaluatorsByFilters,
    getEvaluateds,
    getEvaluatedsByFilters,
    createStaff,
    updateStaff,
    deleteStaff,
    uploadImage,
    uploadStaffDocumentation
}
module.exports = StaffController
```

- [ ] **Step 5: Agregar Swagger a `src/routes/catalogs/staff.routes.js`**

Reemplazar el archivo completo con:

```js
const { Router } = require('express');
const StaffController  = require ('../../controllers/catalogs/staff.controller');
const { uploadImageFile, uploadManyFiles, uploadPdfFile } = require('../../utils/uploadConfiguration');

const router = Router();

/**
 * @openapi
 * /staffs:
 *   get:
 *     summary: Listar todo el personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de personal
 */
router.get('/',StaffController.getAllStaffs);

/**
 * @openapi
 * /staffs/{staff_id}:
 *   get:
 *     summary: Obtener un miembro del personal por ID
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de personal codificado (hashids)
 *     responses:
 *       200:
 *         description: Miembro del personal encontrado
 */
router.get('/:staff_id',StaffController.getStaff);

/**
 * @openapi
 * /staffs/{staff_id}/companies:
 *   get:
 *     summary: Listar las empresas asignadas a un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de empresas con datos de yate
 */
router.get('/:staff_id/companies',StaffController.getStaffCompanies);

/**
 * @openapi
 * /staffs/createStaff:
 *   post:
 *     summary: Crear un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, cellPhone, contractType, departamentId, positionId]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               cellPhone:
 *                 type: string
 *               contractType:
 *                 type: string
 *               departamentId:
 *                 type: string
 *                 description: ID de departamento codificado (hashids)
 *               positionId:
 *                 type: string
 *                 description: ID de posicion codificado (hashids)
 *     responses:
 *       200:
 *         description: Personal creado
 *       500:
 *         description: Error inesperado
 */
router.post('/createStaff',StaffController.createStaff);

/**
 * @openapi
 * /staffs/updateStaff/{staff_id}:
 *   put:
 *     summary: Actualizar un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Personal actualizado
 */
router.put('/updateStaff/:staff_id',StaffController.updateStaff);

/**
 * @openapi
 * /staffs/{staff_id}/uploadImageFile:
 *   put:
 *     summary: Subir una imagen (foto o firma) de un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [type, file]
 *             properties:
 *               type:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagen actualizada
 *       400:
 *         description: Archivo o campo type faltante
 */
router.put('/:staff_id/uploadImageFile', uploadImageFile, StaffController.uploadImage);

/**
 * @openapi
 * /staffs/update/documentation/{staff_id}:
 *   put:
 *     summary: Subir un documento (PDF) de un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [id, file]
 *             properties:
 *               id:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Documentacion guardada
 *       400:
 *         description: Archivo faltante
 */
router.put('/update/documentation/:staff_id', uploadPdfFile, StaffController.uploadStaffDocumentation);

/**
 * @openapi
 * /staffs/{staff_id}:
 *   delete:
 *     summary: Eliminar un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Personal eliminado
 */
router.delete('/:staff_id',StaffController.deleteStaff);

//evaluators and evaluated
router.get('/send_form/evaluators',StaffController.getEvaluators);
router.get('/send_form/evaluatorsByFilters',StaffController.getEvaluatorsByFilters);
router.get('/send_form/evaluateds',StaffController.getEvaluateds);
router.get('/send_form/evaluatedsByFilters',StaffController.getEvaluatedsByFilters);


module.exports = router;
```

(Los 4 endpoints de `evaluators`/`evaluateds` reciben su Swagger en la Task 4, junto con su retrofit de errores — no se documentan aquí para no adelantarse a esa task.)

- [ ] **Step 6: Correr los tests nuevos y confirmar que pasan**

Run: `npm test -- tests/domain/auth-staff-users/staff-crud.test.js`
Expected: PASS (todos los tests)

- [ ] **Step 7: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS, incluyendo el smoke test de `warehouse`/otros dominios que no se tocan en esta task.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/catalogs/staff.controller.js src/routes/catalogs/staff.routes.js tests/helpers/staffFixtures.js tests/domain/auth-staff-users/staff-crud.test.js
git commit -m "feat: retrofit AppError + tests profundos + swagger en staff CRUD"
```

---

### Task 4: Retrofit + tests + Swagger de `staff` evaluators (4 endpoints)

**Files:**
- Modify: `src/controllers/catalogs/staff.controller.js` (ya reescrito completo en Task 3 — esta task solo confirma que los 4 métodos de evaluators ya quedaron retrofiteados, ver nota abajo)
- Modify: `src/routes/catalogs/staff.routes.js`
- Create: `tests/domain/auth-staff-users/staff-evaluators.test.js`

**Interfaces:**
- Consume: `staffFixtures.js` de Task 3.

**Nota:** `getEvaluators`, `getEvaluatorsByFilters`, `getEvaluateds`, `getEvaluatedsByFilters` ya se retrofitearon a `next(error)` como parte del reemplazo completo del archivo en la Task 3 Step 4 (el archivo se reescribió entero). Esta task solo agrega su Swagger y sus tests — no vuelve a tocar el controller.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/domain/auth-staff-users/staff-evaluators.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const StaffCompany = require('../../../src/models/catalogs/staffCompany.models');
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

async function createEvaluatorStaff() {
    const departament = await createDepartment();
    const position = await createPosition();
    const { company } = await createCompanyWithYacht();
    const staff = await Staff.create({
        firstName: 'Evaluador',
        lastName: 'Uno',
        email: `evaluador-${Date.now()}-${Math.random()}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
    });
    await StaffCompany.create({ staffId: staff.id, companyId: company.id });
    return { staff, departament, position, company };
}

describe('GET /api/staffs/send_form/evaluators', () => {
    it('returns evaluators matching the encoded ids in search', async () => {
        const { staff } = await createEvaluatorStaff();

        const response = await request(app)
            .get('/api/staffs/send_form/evaluators')
            .query({ search: Utils.encode(staff.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].dataValues.id).toBe(Utils.encode(staff.id));
    });

    it('returns an empty array when search is not provided', async () => {
        const response = await request(app)
            .get('/api/staffs/send_form/evaluators')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
});

describe('GET /api/staffs/send_form/evaluatorsByFilters', () => {
    it('filters evaluators by companyId and positionId', async () => {
        const { staff, position, company } = await createEvaluatorStaff();

        const response = await request(app)
            .get('/api/staffs/send_form/evaluatorsByFilters')
            .query({
                companyId: Utils.encode(company.id),
                positionId: Utils.encode(position.id),
            })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.some((x) => x.dataValues.id === Utils.encode(staff.id))).toBe(true);
    });
});

describe('GET /api/staffs/send_form/evaluateds', () => {
    it('returns evaluated staff matching the encoded ids in search', async () => {
        const { staff } = await createEvaluatorStaff();

        const response = await request(app)
            .get('/api/staffs/send_form/evaluateds')
            .query({ search: Utils.encode(staff.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
    });
});

describe('GET /api/staffs/send_form/evaluatedsByFilters', () => {
    it('filters evaluated staff by companyId', async () => {
        const { staff, company } = await createEvaluatorStaff();

        const response = await request(app)
            .get('/api/staffs/send_form/evaluatedsByFilters')
            .query({ companyId: Utils.encode(company.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.some((x) => x.dataValues.id === Utils.encode(staff.id))).toBe(true);
    });
});
```

- [ ] **Step 2: Correr los tests y confirmar que ya pasan**

Run: `npm test -- tests/domain/auth-staff-users/staff-evaluators.test.js`
Expected: PASS (todos los tests). A diferencia de las demás tasks, aquí no hay ciclo red→green: el comportamiento de los 4 endpoints de `evaluators`/`evaluateds` ya quedó correcto en la Task 3 Step 4 (se retrofitearon a `next(error)` junto con el resto del archivo); estos tests solo verifican y fijan ese comportamiento ya existente. Si algo falla aquí, es una señal de que la Task 3 no se aplicó correctamente — volver a esa task antes de continuar.

- [ ] **Step 3: Agregar Swagger a los 4 endpoints de evaluators en `src/routes/catalogs/staff.routes.js`**

Reemplazar:

```js
//evaluators and evaluated
router.get('/send_form/evaluators',StaffController.getEvaluators);
router.get('/send_form/evaluatorsByFilters',StaffController.getEvaluatorsByFilters);
router.get('/send_form/evaluateds',StaffController.getEvaluateds);
router.get('/send_form/evaluatedsByFilters',StaffController.getEvaluatedsByFilters);
```

por:

```js
//evaluators and evaluated
/**
 * @openapi
 * /staffs/send_form/evaluators:
 *   get:
 *     summary: Listar evaluadores por IDs
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Lista de IDs codificados separados por coma
 *     responses:
 *       200:
 *         description: Lista de evaluadores
 */
router.get('/send_form/evaluators',StaffController.getEvaluators);

/**
 * @openapi
 * /staffs/send_form/evaluatorsByFilters:
 *   get:
 *     summary: Listar evaluadores filtrados por empresa/departamento/posicion
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: departamentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: positionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de evaluadores filtrada
 */
router.get('/send_form/evaluatorsByFilters',StaffController.getEvaluatorsByFilters);

/**
 * @openapi
 * /staffs/send_form/evaluateds:
 *   get:
 *     summary: Listar evaluados por IDs
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de evaluados
 */
router.get('/send_form/evaluateds',StaffController.getEvaluateds);

/**
 * @openapi
 * /staffs/send_form/evaluatedsByFilters:
 *   get:
 *     summary: Listar evaluados filtrados por empresa
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de evaluados filtrada
 */
router.get('/send_form/evaluatedsByFilters',StaffController.getEvaluatedsByFilters);
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npm test -- tests/domain/auth-staff-users/staff-evaluators.test.js`
Expected: PASS (todos los tests)

- [ ] **Step 5: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/catalogs/staff.routes.js tests/domain/auth-staff-users/staff-evaluators.test.js
git commit -m "test: swagger y tests profundos para endpoints de evaluators/evaluateds"
```

---

### Task 5: Retrofit + bug fix + tests + Swagger del dominio `users` (5 endpoints)

**Files:**
- Modify: `src/services/catalogs/users.services.js`
- Modify: `src/controllers/catalogs/users.controller.js`
- Modify: `src/routes/catalogs/users.routes.js`
- Create: `tests/domain/auth-staff-users/users.test.js`

**Interfaces:**
- `UserController.*` pasan de `(req, res)` a `(req, res, next)`.
- `UserService.getUserById` cambia su `attributes` (ver Step 3) — la forma del objeto devuelto cambia de `{first_name, last_name, email, active, role_id}` (roto, sin `id`) a `{id, firstName, lastName, email, active, roleId}`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/domain/auth-staff-users/users.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const Users = require('../../../src/models/catalogs/user.models');
const Roles = require('../../../src/models/catalogs/roles.models');
const Utils = require('../../../src/utils/Utils');

jest.mock('../../../src/mails/mailer', () => ({
    sendEmail: jest.fn(),
    sendEmailPasswordStaff: jest.fn(),
}));

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

async function createBasicUser(overrides = {}) {
    const role = await Roles.create({ name: `role-${Date.now()}-${Math.random()}` });
    return Users.create({
        firstName: 'Elena',
        lastName: 'Ruiz',
        email: `user-${Date.now()}-${Math.random()}@example.com`,
        password: 'Sup3rSecret!',
        roleId: role.id,
        active: true,
        ...overrides,
    });
}

describe('GET /api/users', () => {
    it('lists users with encoded ids', async () => {
        const user = await createBasicUser({ firstName: 'Fernanda' });

        const response = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.dataValues.id === Utils.encode(user.id));
        expect(found).toBeDefined();
        expect(found.dataValues.firstName).toBe('Fernanda');
    });
});

describe('GET /api/users/:user_id', () => {
    it('returns a single user with id and all fields correctly populated', async () => {
        const user = await createBasicUser({ firstName: 'Gabriel' });

        const response = await request(app)
            .get(`/api/users/${Utils.encode(user.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(user.id));
        expect(response.body.firstName).toBe('Gabriel');
        expect(response.body.roleId).toBe(Utils.encode(user.roleId));
    });
});

describe('POST /api/users/createUser', () => {
    it('creates a user with a generated password and decoded roleId', async () => {
        const role = await Roles.create({ name: `role-${Date.now()}-${Math.random()}` });

        const response = await request(app)
            .post('/api/users/createUser')
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'Hugo',
                lastName: 'Diaz',
                email: 'hugo@example.com',
                roleId: Utils.encode(role.id),
            });

        expect(response.status).toBe(200);
        const created = await Users.findOne({ where: { email: 'hugo@example.com' } });
        expect(created).not.toBeNull();
        expect(created.roleId).toBe(role.id);
    });
});

describe('PUT /api/users/updateUser/:user_id', () => {
    it('updates a user', async () => {
        const user = await createBasicUser();
        const newRole = await Roles.create({ name: `role-${Date.now()}-${Math.random()}` });

        const response = await request(app)
            .put(`/api/users/updateUser/${Utils.encode(user.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName: 'Elena Actualizada', roleId: Utils.encode(newRole.id) });

        expect(response.status).toBe(200);
        await user.reload();
        expect(user.firstName).toBe('Elena Actualizada');
        expect(user.roleId).toBe(newRole.id);
    });
});

describe('DELETE /api/users/:user_id', () => {
    it('deletes a user', async () => {
        const user = await createBasicUser();

        const response = await request(app)
            .delete(`/api/users/${Utils.encode(user.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Users.findByPk(user.id);
        expect(found).toBeNull();
    });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- tests/domain/auth-staff-users/users.test.js`
Expected: FAIL — el test de `GET /api/users/:user_id` falla porque hoy `result.id`/`result.firstName` son `undefined` (bug de `getUserById`).

- [ ] **Step 3: Corregir `src/services/catalogs/users.services.js`**

Reemplazar:

```js
    static async getUserById(id) {
        try {
            const result = await Users.findOne({
                where: { id },
                attributes: ['first_name', 'last_name', 'email', 'active', 'role_id'],
                include: {
                    model: Roles,
                    as: 'user_rol',
                    attributes: ['name'],
                }

            });
            return result;
        } catch (error) {
            throw error;
        }
    }
```

por:

```js
    static async getUserById(id) {
        try {
            const result = await Users.findOne({
                where: { id },
                attributes: ['id', 'firstName', 'lastName', 'email', 'active', 'roleId'],
                include: {
                    model: Roles,
                    as: 'user_rol',
                    attributes: ['name'],
                }

            });
            return result;
        } catch (error) {
            throw error;
        }
    }
```

- [ ] **Step 4: Reescribir `src/controllers/catalogs/users.controller.js`**

Reemplazar el archivo completo con:

```js
const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const Tokens = require('../../utils/tokens');
const { sendEmail } = require('../../mails/mailer');
const bcrypt = require("bcrypt");

const getAllUsers = async (req, res, next) => {
    try {
        const result = await UserService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.roleId = Utils.encode(x.dataValues.roleId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getUser = async (req, res, next) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const result = await UserService.getUserById(userId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
            result.roleId = Utils.encode(result.roleId);
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createUser = async (req, res, next) => {
    try {
        const user = req.body;
        const passwordGenerate = Tokens.getPasswordRandom();
        user.password = passwordGenerate
        user.roleId = Utils.decode(user.roleId)
        const action = "new user"
        const result = await UserService.createUser(user);
        sendEmail(result, passwordGenerate, action);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}



const updateUser = async (req, res, next) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const user = req.body;
        delete user.id
        user.roleId = Utils.decode(req.body.roleId);
        await UserService.updateUser(user, {
            where: { id: userId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteUser = async (req, res, next) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const result = await UserService.delete({
            where: { id: userId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
    }
}

const UserController = {
    getAllUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
}
module.exports = UserController
```

(La única diferencia de comportamiento fuera del retrofit de errores es en `getUser`, línea `result.roleId = Utils.encode(result.roleId)` en vez de `result.role_id = Utils.encode(result.role_id)`, consistente con el fix de la Step 3.)

- [ ] **Step 5: Agregar Swagger a `src/routes/catalogs/users.routes.js`**

Reemplazar el archivo completo con:

```js
const { Router } = require('express');
const UserController  = require ('../../controllers/catalogs/users.controller');

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Listar todos los usuarios administrativos
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/',UserController.getAllUsers);

/**
 * @openapi
 * /users/{user_id}:
 *   get:
 *     summary: Obtener un usuario administrativo por ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de usuario codificado (hashids)
 *     responses:
 *       200:
 *         description: Usuario encontrado
 */
router.get('/:user_id',UserController.getUser);

/**
 * @openapi
 * /users/createUser:
 *   post:
 *     summary: Crear un usuario administrativo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, roleId]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               roleId:
 *                 type: string
 *                 description: ID de rol codificado (hashids)
 *     responses:
 *       200:
 *         description: Usuario creado, contrasena generada enviada por correo
 *       500:
 *         description: Error inesperado
 */
router.post('/createUser',UserController.createUser);

/**
 * @openapi
 * /users/updateUser/{user_id}:
 *   put:
 *     summary: Actualizar un usuario administrativo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado
 */
router.put('/updateUser/:user_id',UserController.updateUser);

/**
 * @openapi
 * /users/{user_id}:
 *   delete:
 *     summary: Eliminar un usuario administrativo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado
 */
router.delete('/:user_id',UserController.deleteUser);


module.exports = router;
```

- [ ] **Step 6: Correr los tests nuevos y confirmar que pasan**

Run: `npm test -- tests/domain/auth-staff-users/users.test.js`
Expected: PASS (todos los tests)

- [ ] **Step 7: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/services/catalogs/users.services.js src/controllers/catalogs/users.controller.js src/routes/catalogs/users.routes.js tests/domain/auth-staff-users/users.test.js
git commit -m "fix: corregir getUserById + retrofit AppError + tests profundos + swagger en users"
```

---

### Task 6: Actualizar `docs/CONVENTIONS.md`

**Files:**
- Modify: `docs/CONVENTIONS.md`

**Interfaces:** ninguna (documentación pura).

- [ ] **Step 1: Actualizar la sección "Manejo de errores y respuestas HTTP"**

En `docs/CONVENTIONS.md`, reemplazar el bloque completo:

```markdown
## Manejo de errores y respuestas HTTP

El estándar oficial usa `AppError` (`src/errors/AppError.js`) y el
middleware `errorHandler` (`src/middlewares/errorHandler.middleware.js`),
ambos construidos en Fase 0 y ya registrados en `src/app.js`.

**Antes (patrón legado, todavía presente en la mayoría de controllers):**

\`\`\`js
try {
    const result = await Service.getAll();
    res.status(200).json(result);
} catch (error) {
    res.status(400).json(error.message);
}
\`\`\`

**Convención nueva (para código nuevo o tocado):**

\`\`\`js
const AppError = require('../errors/AppError');

const getAll = async (req, res, next) => {
    try {
        const result = await Service.getAll();
        res.status(200).json(result);
    } catch (error) {
        next(error instanceof AppError ? error : new AppError(error.message, 400));
    }
};
\`\`\`

La respuesta de error resultante tiene esta forma:

\`\`\`json
{ "error": { "message": "mensaje descriptivo", "code": "AppError" } }
\`\`\`

El retrofit de los controllers existentes al patrón nuevo se hace dominio
por dominio en Fase 2, no de una vez.
```

por:

```markdown
## Manejo de errores y respuestas HTTP

El estándar oficial usa `AppError` (`src/errors/AppError.js`) y el
middleware `errorHandler` (`src/middlewares/errorHandler.middleware.js`),
ambos construidos en Fase 0 y ya registrados en `src/app.js`.

**Antes (patrón legado, todavía presente en controllers sin refactorizar):**

\`\`\`js
try {
    const result = await Service.getAll();
    res.status(200).json(result);
} catch (error) {
    res.status(400).json(error.message);
}
\`\`\`

**Convención (adoptada por primera vez en Fase 2, dominio auth/staff/users):**

\`\`\`js
const AppError = require('../errors/AppError');

const getAll = async (req, res, next) => {
    try {
        const result = await Service.getAll();
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getOne = async (req, res, next) => {
    try {
        const result = await Service.getById(req.params.id);
        if (!result) throw new AppError('Recurso no encontrado', 404);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
\`\`\`

Regla: un caso de error de negocio identificable (no encontrado,
credenciales inválidas, validación de campos, etc.) lanza `new
AppError(mensaje, statusCode)` con el status HTTP correcto (400, 401, 403,
404, ...). Cualquier otro error (fallo de DB, excepción inesperada) se pasa
tal cual con `next(error)` — `errorHandler` ya default-ea a 500 para
cualquier error que no sea instancia de `AppError`, así que **no** hace
falta envolver todo en un `AppError` genérico de 400.

La respuesta de error resultante tiene esta forma:

\`\`\`json
{ "error": { "message": "mensaje descriptivo", "code": "AppError" } }
\`\`\`

(`code` es `'INTERNAL_ERROR'` en vez de `'AppError'` cuando el status es
500 por un error no clasificado.)

El retrofit de los controllers existentes al patrón nuevo se hace dominio
por dominio en Fase 2. Dominios ya retrofiteados: `auth`, `staff`, `users`.
```

- [ ] **Step 2: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS (documentación, no toca código).

- [ ] **Step 3: Commit**

```bash
git add docs/CONVENTIONS.md
git commit -m "docs: actualizar CONVENTIONS.md con el patrón real de next(error) y dominios retrofiteados"
```

---

### Task 7: Verificación final contra criterios de éxito del spec

**Files:** ninguno creado/modificado — solo verificación.

- [ ] **Step 1: Confirmar que no queda ningún `res.status(400).json(error.message)` en el dominio**

Run: `grep -rn "res.status(400).json(error.message)" src/controllers/catalogs/auth.controller.js src/controllers/catalogs/staff.controller.js src/controllers/catalogs/users.controller.js`
Expected: sin output

- [ ] **Step 2: Confirmar que `H5512` ya no existe en el código fuente**

Run: `grep -rn "H5512" src`
Expected: sin output

- [ ] **Step 3: Confirmar que `forgotPassword`/`forgotPasswordStaff` responden siempre (nunca cuelgan)**

Run: `grep -n "if (result) {" src/controllers/catalogs/auth.controller.js; grep -n "if (staff) {" src/controllers/catalogs/auth.controller.js`
Expected: sin output (ambos si-condicionales sin `else` fueron reemplazados por `if (!result) throw ...` / `if (!staff) throw ...`)

- [ ] **Step 4: Correr la suite completa**

Run: `npm test`
Expected: todos los tests PASS — 10 smoke tests + unit tests de Fase 0/1 + los tests nuevos de este dominio (auth, staff-crud, staff-evaluators, users, auth.middleware).

- [ ] **Step 5: Confirmar que Swagger sirve las nuevas rutas documentadas**

Run: `npm test -- tests/smoke/swagger.smoke.test.js`
Expected: PASS (ya cubierto por el smoke test existente de Fase 0, re-confirmado aquí)

- [ ] **Step 6: Confirmar que `npm run lint` sigue corriendo**

Run: `npm run lint`
Expected: completa sin crashear (warnings/errores en código preexistente son esperados).

- [ ] **Step 7: Revisar el diff contra el spec — solo el dominio auth/staff/users cambia**

Run: `git diff trunk --stat`
Expected: solo archivos de `src/controllers/catalogs/{auth,staff,users}.controller.js`, `src/routes/catalogs/{auth,staff,users}.routes.js`, `src/services/catalogs/users.services.js`, `src/middlewares/auth.middleware.js`, `docs/CONVENTIONS.md`, y los archivos de test nuevos/modificados de las Tasks 1-6. Ningún otro controller, service, o ruta fuera de este dominio.

No hay commit para esta task — es una pasada de verificación. Si algún paso falla, volver a la task dueña de ese archivo y corregirlo ahí (con su propio commit), luego re-correr este checklist.

---

## Self-Review Notes

- **Cobertura del spec:** Sección 1 (retrofit errores, 23 endpoints) → Tasks 2, 3, 4, 5. Sección 2 (fix H5512) → Task 1. Sección 3 (fix forgotPassword/forgotPasswordStaff) → Task 2. Sección 3b (fix getUserById) → Task 5. Sección 4 (tests profundos) → Tasks 2-5 (cada endpoint tiene su test). Sección 5 (Swagger completo) → Tasks 2-5. Criterios de éxito → Task 7.
- **Orden de tasks:** Task 3 crea `tests/helpers/staffFixtures.js`, que Task 4 consume — el orden 1→2→3→4→5→6→7 respeta esa dependencia. Task 5 reescribe `users.controller.js` completo, incluyendo el ajuste de `result.role_id` → `result.roleId` que depende del fix de Step 3 en el mismo task — ambos steps están en la misma task, no hay dependencia cruzada de tasks para esto.
- **Consistencia de firmas:** `createDepartment`/`createPosition`/`createCompanyWithYacht` (Task 3) se consumen con la misma firma en Task 4 y Task 5 no las necesita (usa `Roles` directamente, sin dependencias de staff). `AppError` (Fase 0) se usa con la firma `(message, statusCode)` de forma idéntica en las 4 tasks que lo consumen.
- **Placeholder scan:** sin TBD/TODO; cada step de código tiene contenido literal completo (archivos reescritos enteros donde el diff es grande, evitando ambigüedad de "reemplazar solo esta línea" en archivos con múltiples ocurrencias similares).
- **Bug pre-existente encontrado y NO cubierto por este plan:**
  `src/controllers/catalogs/staff.controller.js`, función `getStaff`, línea
  `result.companies = result.companies.map(x => (x.dataValues.companyId =
  Utils.encode(x.dataValues.companyId)))` — el callback de `.map()` es una
  expresión de asignación, cuyo valor de retorno es el string codificado,
  no `x`. El resultado real es que `result.companies` queda como un array
  de strings (los `companyId` codificados), no como los objetos de empresa
  completos que el resto del código asume. El test de `GET
  /api/staffs/:staff_id` de la Task 3 no crea ninguna `StaffCompany` para
  el staff de prueba, así que no ejercita esta rama y el bug queda sin
  cubrir — decisión consciente para no reabrir una tercera negociación de
  alcance de bug fix a mitad de este plan; queda anotado aquí para
  corregirse en una pasada futura (no bloquea los criterios de éxito de
  este sub-proyecto, que no mencionan este campo).
- **Riesgo de mails reales en tests:** tanto `tests/domain/auth-staff-users/auth.test.js` (Task 2, cubre `forgotPassword`/`forgotPasswordStaff`) como `tests/domain/auth-staff-users/users.test.js` (Task 5, cubre `createUser`) hacen `jest.mock('../../../src/mails/mailer', ...)` al inicio del archivo, para que ningún test dispare una llamada real a SendGrid.
