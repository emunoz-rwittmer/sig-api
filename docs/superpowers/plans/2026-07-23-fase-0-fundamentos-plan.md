# Fase 0 — Fundamentos Seguros: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `interno-api` a minimal but real safety net (tests, linting, centralized error handling, env validation, API docs) before any structural refactor touches business logic, without changing any existing route, response shape, or business rule.

**Architecture:** Purely additive changes. `app.js` gains a handful of new `require`/`app.use` calls and two small guards (cron scheduling skipped in tests, a `.ready` promise exported for tests to await); no existing controller, service, or model is modified except `Utils.js` (one line: hardcoded salt → env var). New capability lives in new files (`src/errors/`, `src/config/`, `tests/`).

**Tech Stack:** Node.js, Express 4, Sequelize 6 (MySQL), Mongoose (MongoDB), Jest + Supertest for tests, ESLint 8 + Prettier for linting/formatting, swagger-jsdoc + swagger-ui-express for API docs.

## Global Constraints

- Branch: `refactor/fase-0-fundamentos` (already created off `trunk`).
- No mass reformatting of existing files — ESLint/Prettier are installed and wired to scripts, but existing `src/` files are not rewritten in this phase.
- No changes to `Utils.js` beyond moving the hardcoded hashids salt to `process.env.HASHIDS_SALT` (Task 3). No other method in `Utils.js` changes.
- No route renaming, no response-shape changes, no business-logic changes anywhere.
- Do NOT fix the `H5512`/`HS512` typo in `src/middlewares/auth.middleware.js` — documented only, out of scope (Fase 1+).
- Tests in this phase are **smoke tests only** (login + 1 list endpoint per domain, status code + basic shape) — no deep business-rule assertions.
- **Critical:** in production, `HASHIDS_SALT` must be set to the exact string `tiptop-hlfe/r0lf` (the value currently hardcoded in `Utils.js`). This value is baked into previously generated encoded IDs (e.g. comment-card QR codes already printed and in circulation). Changing it breaks every previously issued encoded ID. Test/dev environments may use any value.
- CommonJS modules throughout (`require`/`module.exports`) — no ESM conversion.
- Windows + Git Bash / PowerShell dev environment — avoid shell syntax that only works on POSIX (e.g. no inline `VAR=x command`); set env vars from within Node (`tests/env.setup.js`) instead of npm script prefixes.

## Prerequisites (manual, before Task 1's tests can run)

The user must create `.env.test` in the project root (already gitignored by this plan — see Task 1) with real credentials for a **test** MySQL database and a **test** MongoDB database, separate from production. Use `.env.example` (created in Task 1) as the field template. Without this file populated with reachable test-DB credentials, none of the test-running steps below will pass — this is expected and not a plan defect.

---

### Task 1: Testing infrastructure + app testability fixes + Auth smoke test

**Files:**
- Create: `jest.config.js`
- Create: `tests/env.setup.js`
- Create: `tests/helpers/testApp.js`
- Create: `tests/helpers/auth.js`
- Create: `tests/smoke/auth.smoke.test.js`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `src/app.js`
- Modify: `package.json` (devDependencies + scripts)

**Interfaces:**
- Produces: `tests/helpers/testApp.js` exports `{ bootTestApp, shutdownTestApp }` where `bootTestApp()` returns `Promise<ExpressApp>` (the app, fully booted and DB-synced) and `shutdownTestApp()` returns `Promise<void>` (closes DB/Mongo connections).
- Produces: `tests/helpers/auth.js` exports `{ createAuthenticatedUser(app) }` returning `Promise<string>` (a valid JWT access token for a freshly created admin user).
- Produces: `src/app.js` now exports the Express `app` with an additional `app.ready` property — a `Promise` that resolves once `db.sync()` completes. All later tasks that need a booted app in tests use `bootTestApp()`, not `require('../../src/app')` directly.

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev jest@^29.7.0 supertest@^7.0.0
```

- [ ] **Step 2: Create `.env.example`**

```
# --- MySQL (Sequelize) ---
DB_NAME=
DB_USER=
DB_HOST=
DB_PORT=3306
DB_PASSWORD=

# --- MongoDB (Mongoose, session tokens) ---
DB_HOST_MONGO=
DB_USER_MONGO=
DB_PASSWORD_MONGO=
DB_NAME_MONGO=

# --- Auth ---
JWT_SECRET=
JWT_REFRESH_SECRET=

# --- Hashids (ID obfuscation) ---
# PRODUCTION MUST use exactly: tiptop-hlfe/r0lf
# (this value is baked into previously issued encoded IDs, e.g. printed QR codes)
HASHIDS_SALT=

# --- Server ---
PORT=8000
NODE_ENV=development

# --- Swagger ---
# Only relevant when NODE_ENV=production. Leave unset/false to keep /api/docs off in prod.
SWAGGER_ENABLED=false
```

- [ ] **Step 3: Add `.env.test` to `.gitignore`**

Modify `.gitignore` — current content is:

```
node_modules
.env
uploads/
.codegpt
encode.js
```

New content:

```
node_modules
.env
.env.test
uploads/
.codegpt
encode.js
```

- [ ] **Step 4: Create `jest.config.js`**

```js
module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/env.setup.js'],
    testMatch: ['**/tests/**/*.test.js'],
    testTimeout: 15000,
};
```

- [ ] **Step 5: Create `tests/env.setup.js`**

```js
require('dotenv').config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
```

- [ ] **Step 6: Fix `src/app.js` for testability**

Current `src/app.js`:

```js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const initMongoBd = require('./utils/mongoDatabase');
const initModels = require('./models/init.models');
const routerApi = require('./routes');
const path = require('path');
const db = require('./utils/database');
require('./utils/cronJobs');

const app = express();

app.use(cors({
    exposedHeaders: ['Content-Disposition']
}))
app.use(express.json({ limit: '10mb' }));
app.use(morgan('tiny'));

// linea para servir IMG o PDF
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

db.authenticate()
    .then(() => console.log('base de datos autenticada'))
    .catch((error) => console.log(error));

initModels();
initMongoBd();

db.sync({ alter: false })
    .then(() => console.log('Base de datos sincronizada'))
    .catch((error) => console.log(error));

routerApi(app);


module.exports = app;
```

Replace it with:

```js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const initMongoBd = require('./utils/mongoDatabase');
const initModels = require('./models/init.models');
const routerApi = require('./routes');
const path = require('path');
const db = require('./utils/database');

// node-cron holds background timers alive; scheduling them during tests
// keeps the Jest process from exiting cleanly and can trigger jobs mid-run.
if (process.env.NODE_ENV !== 'test') {
    require('./utils/cronJobs');
}

const app = express();

app.use(cors({
    exposedHeaders: ['Content-Disposition']
}))
app.use(express.json({ limit: '10mb' }));
app.use(morgan('tiny'));

// linea para servir IMG o PDF
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

db.authenticate()
    .then(() => console.log('base de datos autenticada'))
    .catch((error) => console.log(error));

initModels();
initMongoBd();

// Exposed so tests can await schema sync before firing requests.
app.ready = db.sync({ alter: false })
    .then(() => console.log('Base de datos sincronizada'))
    .catch((error) => console.log(error));

routerApi(app);


module.exports = app;
```

- [ ] **Step 7: Create `tests/helpers/testApp.js`**

```js
const mongoose = require('mongoose');
const db = require('../../src/utils/database');

async function bootTestApp() {
    const app = require('../../src/app');
    await app.ready;

    // MySQL + many FK relationships: force-sync can fail on DROP ordering
    // unless FK checks are relaxed for the duration of the resync.
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.sync({ force: true });
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    return app;
}

async function shutdownTestApp() {
    await db.close();
    await mongoose.connection.close();
}

module.exports = { bootTestApp, shutdownTestApp };
```

- [ ] **Step 8: Create `tests/helpers/auth.js`**

```js
const request = require('supertest');
const Roles = require('../../src/models/catalogs/roles.models');
const Users = require('../../src/models/catalogs/user.models');

const TEST_USER = {
    email: 'smoke-test@example.com',
    password: 'Sup3rSecret!',
};

async function createAuthenticatedUser(app) {
    const role = await Roles.create({ name: 'admin' });
    await Users.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: TEST_USER.email,
        password: TEST_USER.password,
        roleId: role.id,
        active: true,
    });

    const response = await request(app)
        .post('/api/auth/login')
        .send(TEST_USER);

    if (response.status !== 200 || !response.body.token) {
        throw new Error(`No se pudo autenticar el usuario de prueba: ${JSON.stringify(response.body)}`);
    }

    return response.body.token;
}

module.exports = { createAuthenticatedUser, TEST_USER };
```

- [ ] **Step 9: Write the Auth smoke test**

Create `tests/smoke/auth.smoke.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { TEST_USER } = require('../helpers/auth');
const Roles = require('../../src/models/catalogs/roles.models');
const Users = require('../../src/models/catalogs/user.models');

let app;

beforeAll(async () => {
    app = await bootTestApp();
    const role = await Roles.create({ name: 'admin' });
    await Users.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: TEST_USER.email,
        password: TEST_USER.password,
        roleId: role.id,
        active: true,
    });
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Auth smoke test', () => {
    it('logs in with valid credentials and returns a usable token', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send(TEST_USER);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(typeof response.body.token).toBe('string');
        expect(response.body.rol).toBe('admin');
    });

    it('rejects an invalid password', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrong-password' });

        expect(response.status).toBe(400);
    });
});
```

- [ ] **Step 10: Add `test`/`test:watch` scripts to `package.json`**

In `package.json`, replace:

```json
    "test": "echo \"Error: no test specified\" && exit 1"
```

with:

```json
    "test": "jest --runInBand",
    "test:watch": "jest --watch --runInBand"
```

- [ ] **Step 11: Run the test suite**

Run: `npm test -- tests/smoke/auth.smoke.test.js`
Expected: 2 passing tests (`logs in with valid credentials...`, `rejects an invalid password...`). Requires `.env.test` to exist with reachable test-DB credentials (see Prerequisites).

- [ ] **Step 12: Commit**

```bash
git add jest.config.js tests/env.setup.js tests/helpers/testApp.js tests/helpers/auth.js tests/smoke/auth.smoke.test.js .env.example .gitignore src/app.js package.json package-lock.json
git commit -m "test: add Jest/Supertest infra and auth smoke test"
```

---

### Task 2: Startup env-var validation

**Files:**
- Create: `src/config/env.js`
- Create: `tests/unit/config/env.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: none (reads `process.env` directly).
- Produces: `src/config/env.js` exports a function `validateEnv()` — throws `Error` listing missing keys if any required env var is unset; returns `undefined` otherwise. Called synchronously at `src/app.js` boot time.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/config/env.test.js`:

```js
describe('validateEnv', () => {
    const REQUIRED_KEYS = [
        'DB_NAME', 'DB_USER', 'DB_HOST', 'DB_PORT', 'DB_PASSWORD',
        'DB_HOST_MONGO', 'DB_USER_MONGO', 'DB_PASSWORD_MONGO', 'DB_NAME_MONGO',
        'JWT_SECRET', 'JWT_REFRESH_SECRET', 'HASHIDS_SALT',
    ];
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('does not throw when all required vars are set', () => {
        REQUIRED_KEYS.forEach((key) => { process.env[key] = 'value'; });
        const validateEnv = require('../../../src/config/env');
        expect(() => validateEnv()).not.toThrow();
    });

    it('throws listing the missing var when one is absent', () => {
        REQUIRED_KEYS.forEach((key) => { process.env[key] = 'value'; });
        delete process.env.JWT_SECRET;
        const validateEnv = require('../../../src/config/env');
        expect(() => validateEnv()).toThrow(/JWT_SECRET/);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/config/env.test.js`
Expected: FAIL with "Cannot find module '../../../src/config/env'"

- [ ] **Step 3: Create `src/config/env.js`**

```js
const REQUIRED_ENV_VARS = [
    'DB_NAME', 'DB_USER', 'DB_HOST', 'DB_PORT', 'DB_PASSWORD',
    'DB_HOST_MONGO', 'DB_USER_MONGO', 'DB_PASSWORD_MONGO', 'DB_NAME_MONGO',
    'JWT_SECRET', 'JWT_REFRESH_SECRET', 'HASHIDS_SALT',
];

function validateEnv() {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`);
    }
}

module.exports = validateEnv;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/config/env.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire into `src/app.js`**

In `src/app.js`, add the import near the top (after `const db = require('./utils/database');`) and call it before the cron guard:

```js
const db = require('./utils/database');
const validateEnv = require('./config/env');

validateEnv();

// node-cron holds background timers alive; scheduling them during tests
// keeps the Jest process from exiting cleanly and can trigger jobs mid-run.
if (process.env.NODE_ENV !== 'test') {
    require('./utils/cronJobs');
}
```

- [ ] **Step 6: Re-run the full suite to confirm nothing broke**

Run: `npm test`
Expected: All previously passing tests (Task 1's auth smoke test + this task's unit tests) still PASS — `validateEnv()` succeeds because `.env.test` already defines every required key (per `.env.example`, created in Task 1).

- [ ] **Step 7: Commit**

```bash
git add src/config/env.js tests/unit/config/env.test.js src/app.js
git commit -m "feat: validate required env vars at startup"
```

---

### Task 3: Move hashids salt to an env var

**Files:**
- Modify: `src/utils/Utils.js:1-9`
- Create: `tests/unit/utils/Utils.test.js`

**Interfaces:**
- Consumes: `process.env.HASHIDS_SALT` (already required by `validateEnv()` from Task 2; already present in `.env.example`/`.env.test` from Task 1).
- Produces: `Utils.encode(id)` / `Utils.decode(text)` — unchanged signatures, now salt-driven by env var instead of a literal.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/Utils.test.js`:

```js
require('dotenv').config({ path: '.env.test' });
const Utils = require('../../../src/utils/Utils');

describe('Utils.encode / Utils.decode', () => {
    it('round-trips a numeric id', () => {
        const encoded = Utils.encode(42);
        expect(typeof encoded).toBe('string');
        expect(Utils.decode(encoded)).toBe(42);
    });

    it('produces different output for different ids', () => {
        expect(Utils.encode(1)).not.toBe(Utils.encode(2));
    });
});
```

- [ ] **Step 2: Run test to verify current behavior (should already pass against hardcoded salt)**

Run: `npm test -- tests/unit/utils/Utils.test.js`
Expected: PASS (this confirms baseline behavior before the change — the refactor below must keep it passing)

- [ ] **Step 3: Update `src/utils/Utils.js`**

Current lines 1-9:

```js
const Hashids = require('hashids/cjs')
const salt = "tiptop-hlfe/r0lf";
const jwt = require('jsonwebtoken');
const numberKeys = 10;

class Utils {
  static encode(text) {
    const hashids = new Hashids(salt, numberKeys);
    const id = hashids.encode(text);
    return id;
  }

  static decode(text) {
    const hashids = new Hashids(salt, numberKeys);
    const id = hashids.decode(text);
    return id[0];
  }
```

Replace with:

```js
const Hashids = require('hashids/cjs')
const jwt = require('jsonwebtoken');
const numberKeys = 10;

class Utils {
  static encode(text) {
    const hashids = new Hashids(process.env.HASHIDS_SALT, numberKeys);
    const id = hashids.encode(text);
    return id;
  }

  static decode(text) {
    const hashids = new Hashids(process.env.HASHIDS_SALT, numberKeys);
    const id = hashids.decode(text);
    return id[0];
  }
```

(The rest of the file — `getPasswordRandom`, `generateAccessToken`, `generateRefreshToken`, `getSessionRandom`, `formatDateToLocal`, `formatMonthYear`, `asignarPuntaje`, `normalizeQuantity`, `viewCorrectQuantity` — is unchanged.)

- [ ] **Step 4: Run test to verify it still passes**

Run: `npm test -- tests/unit/utils/Utils.test.js`
Expected: PASS (2 tests) — `.env.test`'s `HASHIDS_SALT` value now drives the encoding.

- [ ] **Step 5: Re-run the full suite**

Run: `npm test`
Expected: All tests from Tasks 1-3 PASS (the auth smoke test also exercises `Utils.encode`/`generateAccessToken`, so this is a real end-to-end confirmation, not just the unit test in isolation).

- [ ] **Step 6: Commit**

```bash
git add src/utils/Utils.js tests/unit/utils/Utils.test.js
git commit -m "security: move hashids salt from hardcoded literal to HASHIDS_SALT env var"
```

**Reminder for deployment (not a code step — operational note):** when this branch reaches production, `HASHIDS_SALT` must be set to exactly `tiptop-hlfe/r0lf`, or every previously issued encoded ID (including printed comment-card QR codes) will stop decoding correctly.

---

### Task 4: Centralized error-handling middleware

**Files:**
- Create: `src/errors/AppError.js`
- Create: `src/middlewares/errorHandler.middleware.js`
- Create: `tests/unit/middlewares/errorHandler.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Produces: `src/errors/AppError.js` exports a class `AppError extends Error` with constructor `(message: string, statusCode: number = 500)`, exposing `.statusCode` and `.message`.
- Produces: `src/middlewares/errorHandler.middleware.js` exports an Express error-handling middleware `(err, req, res, next) => void` that responds `{ error: { message, code } }` — `code` is `err.name` for `AppError` instances, `'INTERNAL_ERROR'` otherwise; `statusCode` is `err.statusCode` for `AppError` instances, `500` otherwise.
- This middleware is registered LAST in `src/app.js` (after `routerApi(app)`), so it only catches errors an existing controller's own try/catch doesn't handle (existing controllers are untouched and keep responding with their own `res.status(400).json(...)` shape).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/middlewares/errorHandler.test.js`:

```js
const errorHandler = require('../../../src/middlewares/errorHandler.middleware');
const AppError = require('../../../src/errors/AppError');

function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

describe('errorHandler middleware', () => {
    it('responds with the AppError statusCode and name as code', () => {
        const res = mockRes();
        const err = new AppError('No encontrado', 404);

        errorHandler(err, {}, res, () => {});

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: { message: 'No encontrado', code: 'AppError' } });
    });

    it('defaults to 500/INTERNAL_ERROR for a plain Error', () => {
        const res = mockRes();
        const err = new Error('boom');

        errorHandler(err, {}, res, () => {});

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ error: { message: 'boom', code: 'INTERNAL_ERROR' } });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/middlewares/errorHandler.test.js`
Expected: FAIL with "Cannot find module '../../../src/middlewares/errorHandler.middleware'"

- [ ] **Step 3: Create `src/errors/AppError.js`**

```js
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
    }
}

module.exports = AppError;
```

- [ ] **Step 4: Create `src/middlewares/errorHandler.middleware.js`**

```js
const AppError = require('../errors/AppError');

const errorHandler = (err, req, res, next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const code = err instanceof AppError ? err.name : 'INTERNAL_ERROR';

    res.status(statusCode).json({
        error: {
            message: err.message || 'Internal server error',
            code,
        },
    });
};

module.exports = errorHandler;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/middlewares/errorHandler.test.js`
Expected: PASS (2 tests)

- [ ] **Step 6: Wire into `src/app.js`**

In `src/app.js`, add the import near the top:

```js
const errorHandler = require('./middlewares/errorHandler.middleware');
```

And register it as the last middleware, after `routerApi(app);`:

```js
routerApi(app);

app.use(errorHandler);

module.exports = app;
```

- [ ] **Step 7: Re-run the full suite**

Run: `npm test`
Expected: All tests from Tasks 1-4 PASS. Existing controllers still return their own error shapes (unchanged) since they all catch their own errors before anything reaches `errorHandler`; this middleware is exercised only by future code that calls `next(err)` explicitly (none does yet in Fase 0 — that adoption happens per-domain in Fase 2).

- [ ] **Step 8: Commit**

```bash
git add src/errors/AppError.js src/middlewares/errorHandler.middleware.js tests/unit/middlewares/errorHandler.test.js src/app.js
git commit -m "feat: add centralized error-handling middleware (AppError + errorHandler)"
```

---

### Task 5: Fix stale readme (Postgres -> MySQL)

**Files:**
- Modify: `readme.md`

**Interfaces:** none (documentation cleanup only).

> **Correction from design:** the spec assumed `pg`/`pg-hstore` were listed in `package.json` and needed removing. They are not — `grep -n '"pg"' package.json` / `grep -n '"pg-hstore"' package.json` return nothing; these packages were never actually installed (or were already removed before this plan). Only `readme.md`'s text is stale. No `package.json` change is needed for this task.

- [ ] **Step 1: Confirm `pg`/`pg-hstore` are absent from both code and `package.json`**

Run: `grep -rn "require('pg')" src/ ; grep -rn "require('pg-hstore')" src/ ; grep -n '"pg"' package.json ; grep -n '"pg-hstore"' package.json`
Expected: no output from any of the four greps.

- [ ] **Step 2: Fix `readme.md`**

Read the current `readme.md` first (`cat readme.md`), then:
- Replace any reference to `pg`, `pg-hstore`, or "Postgres"/"PostgreSQL" in the dependency-install step with the actual stack: MySQL (via `sequelize` + `mysql2`) and MongoDB (via `mongoose`).
- Add a "Testing" section documenting `npm test` (runs Jest smoke tests; requires `.env.test`, see `.env.example`).
- Add a "Linting" section documenting `npm run lint` / `npm run lint:fix` / `npm run format` (added in Task 6).
- Add an "API docs" section documenting `npm run dev` then visit `/api/docs` for Swagger UI (added in Task 7).

Since Task 6 and Task 7 haven't run yet at this point in the plan, write these sections now referencing the scripts/endpoint by name — they will exist by the time this branch is complete, and this task doesn't need to re-touch `readme.md` later.

- [ ] **Step 3: Re-run the full suite**

Run: `npm test`
Expected: All tests from Tasks 1-4 still PASS (a documentation-only change doesn't touch runtime code paths).

- [ ] **Step 4: Commit**

```bash
git add readme.md
git commit -m "docs: fix stale readme (Postgres -> MySQL, add testing/lint/docs sections)"
```

---

### Task 6: ESLint + Prettier

**Files:**
- Create: `.eslintrc.json`
- Create: `.eslintignore`
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `package.json` (devDependencies + scripts)

**Interfaces:** none (tooling only — no source files are reformatted in this phase).

- [ ] **Step 1: Install lint/format dependencies**

```bash
npm install --save-dev eslint@^8.57.0 prettier@^3.3.3
```

- [ ] **Step 2: Create `.eslintrc.json`**

```json
{
  "env": {
    "node": true,
    "commonjs": true,
    "es2021": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "script"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off"
  }
}
```

- [ ] **Step 3: Create `.eslintignore`**

```
node_modules
graphify-out
uploads
docs
```

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 5: Create `.prettierignore`**

```
node_modules
graphify-out
uploads
docs
package-lock.json
```

- [ ] **Step 6: Add scripts to `package.json`**

```json
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write src"
```

- [ ] **Step 7: Run the linter to confirm it executes**

Run: `npm run lint`
Expected: exits with a non-fatal report — warnings/errors on **existing** `src/` code are expected and acceptable in this phase (the config must run without crashing; it is not required to report zero issues). If the command itself errors out (e.g. "config not found", parser crash), that is a real failure to fix; a list of lint warnings on existing code is not.

- [ ] **Step 8: Re-run the full test suite**

Run: `npm test`
Expected: All tests from Tasks 1-4 still PASS (linting doesn't execute or alter code).

- [ ] **Step 9: Commit**

```bash
git add .eslintrc.json .eslintignore .prettierrc .prettierignore package.json package-lock.json
git commit -m "chore: add ESLint + Prettier configuration and npm scripts"
```

---

### Task 7: Swagger/OpenAPI documentation

**Files:**
- Create: `src/config/swagger.js`
- Modify: `src/app.js`
- Modify: `src/routes/catalogs/auth.routes.js`
- Modify: `src/routes/catalogs/company.routes.js`
- Create: `tests/smoke/swagger.smoke.test.js`
- Modify: `package.json` (dependencies)

**Interfaces:**
- Produces: `src/config/swagger.js` exports a function `setupSwagger(app)` that mounts Swagger UI at `/api/docs` (always in non-production; gated behind `SWAGGER_ENABLED=true` in production).

- [ ] **Step 1: Install Swagger dependencies (runtime, not dev — the app requires these unconditionally at boot)**

```bash
npm install swagger-jsdoc@^6.2.8 swagger-ui-express@^5.0.1
```

- [ ] **Step 2: Write the failing smoke test**

Create `tests/smoke/swagger.smoke.test.js`:

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');

let app;

beforeAll(async () => {
    app = await bootTestApp();
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Swagger docs smoke test', () => {
    it('serves Swagger UI at /api/docs', async () => {
        const response = await request(app).get('/api/docs/');
        expect(response.status).toBe(200);
        expect(response.text).toContain('swagger-ui');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/smoke/swagger.smoke.test.js`
Expected: FAIL with status 404 (route doesn't exist yet)

- [ ] **Step 4: Create `src/config/swagger.js`**

```js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'interno-api',
            version: '1.0.0',
            description: 'API interna de Rolf Wittmer (bar, catalogos, indicadores, inventario, RRHH, etc.)',
        },
        servers: [{ url: '/api' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/**/*.js'],
});

function setupSwagger(app) {
    if (process.env.NODE_ENV === 'production' && process.env.SWAGGER_ENABLED !== 'true') {
        return;
    }
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
```

- [ ] **Step 5: Wire into `src/app.js`**

Add the import near the top:

```js
const setupSwagger = require('./config/swagger');
```

And call it after `routerApi(app);`, before the error handler:

```js
routerApi(app);

setupSwagger(app);

app.use(errorHandler);

module.exports = app;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/smoke/swagger.smoke.test.js`
Expected: PASS (1 test)

- [ ] **Step 7: Document the 2 example routes**

In `src/routes/catalogs/auth.routes.js`, add a JSDoc block directly above `router.post('/login', AuthController.login);`:

```js
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesion como usuario administrativo
 *     tags: [Auth]
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
 *         description: Credenciales invalidas
 */
router.post('/login', AuthController.login);
```

In `src/routes/catalogs/company.routes.js`, add JSDoc blocks above the two GET routes:

```js
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
 *       400:
 *         description: Error al obtener la empresa
 */
router.get('/:company_id', CompanyController.getCompany);
```

- [ ] **Step 8: Re-run the full suite**

Run: `npm test`
Expected: All tests from Tasks 1-4 and this task PASS.

- [ ] **Step 9: Commit**

```bash
git add src/config/swagger.js src/app.js src/routes/catalogs/auth.routes.js src/routes/catalogs/company.routes.js tests/smoke/swagger.smoke.test.js package.json package-lock.json
git commit -m "feat: add Swagger/OpenAPI docs at /api/docs with auth+companies as reference routes"
```

---

### Task 8: Remaining domain smoke tests

**Files:**
- Create: `tests/smoke/companies.smoke.test.js`
- Create: `tests/smoke/bar.smoke.test.js`
- Create: `tests/smoke/indicators.smoke.test.js`
- Create: `tests/smoke/warehouse.smoke.test.js`
- Create: `tests/smoke/orders.smoke.test.js`
- Create: `tests/smoke/shippingGuide.smoke.test.js`
- Create: `tests/smoke/questions.smoke.test.js`
- Create: `tests/smoke/requests.smoke.test.js`
- Create: `tests/smoke/trading.smoke.test.js`

**Interfaces:**
- Consumes: `bootTestApp`/`shutdownTestApp` from `tests/helpers/testApp.js` (Task 1), `createAuthenticatedUser` from `tests/helpers/auth.js` (Task 1).
- All 8 files follow the identical shape below — only the endpoint path, describe label, and filename change. Each is its own step (write, run, commit) so a broken domain test doesn't block the others from being reviewed independently.

- [ ] **Step 1: `tests/smoke/companies.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Companies smoke test', () => {
    it('lists companies for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/companies')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/companies.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/companies.smoke.test.js
git commit -m "test: add companies domain smoke test"
```

- [ ] **Step 2: `tests/smoke/bar.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Bar smoke test', () => {
    it('lists cruises for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/bar/cruises')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/bar.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/bar.smoke.test.js
git commit -m "test: add bar domain smoke test"
```

- [ ] **Step 3: `tests/smoke/indicators.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Indicators smoke test', () => {
    it('lists formulas for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/indicators/formulas/indicators')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/indicators.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/indicators.smoke.test.js
git commit -m "test: add indicators domain smoke test"
```

- [ ] **Step 4: `tests/smoke/warehouse.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Warehouse (inventory) smoke test', () => {
    it('lists warehouses for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/warehouse')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/warehouse.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/warehouse.smoke.test.js
git commit -m "test: add inventory/warehouse domain smoke test"
```

- [ ] **Step 5: `tests/smoke/orders.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Orders smoke test', () => {
    it('lists orders for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/orders.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/orders.smoke.test.js
git commit -m "test: add orders domain smoke test"
```

- [ ] **Step 6: `tests/smoke/shippingGuide.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Shipping guide smoke test', () => {
    it('lists shipping guides for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/shipping_guides')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/shippingGuide.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/shippingGuide.smoke.test.js
git commit -m "test: add shipping guide domain smoke test"
```

- [ ] **Step 7: `tests/smoke/questions.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Surveys (questions) smoke test', () => {
    it('lists questions for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/questions')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/questions.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/questions.smoke.test.js
git commit -m "test: add surveys/questions domain smoke test"
```

- [ ] **Step 8: `tests/smoke/requests.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Yacht request smoke test', () => {
    it('lists requests for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/requests')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/requests.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/requests.smoke.test.js
git commit -m "test: add yacht request domain smoke test"
```

- [ ] **Step 9: `tests/smoke/trading.smoke.test.js`**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('RRHH (trading) smoke test', () => {
    it('lists tradings for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/tradings')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```

Run: `npm test -- tests/smoke/trading.smoke.test.js` — Expected: PASS (1 test)

Commit:
```bash
git add tests/smoke/trading.smoke.test.js
git commit -m "test: add rrhh/trading domain smoke test"
```

---

### Task 9: Final verification against spec success criteria

**Files:** none created/modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All 10 smoke tests (auth, companies, bar, indicators, warehouse, orders, shippingGuide, questions, requests, trading) + all unit tests (env, Utils, errorHandler) PASS. This is the "10 smoke tests" success criterion from the spec.

- [ ] **Step 2: Confirm linting runs**

Run: `npm run lint`
Expected: completes without crashing (warnings on pre-existing code are fine, per Task 6).

- [ ] **Step 3: Confirm env validation fails fast**

Run: `node -e "require('dotenv').config({path:'.env.test'}); delete process.env.JWT_SECRET; require('./src/config/env')();"`
Expected: throws `Error: Faltan variables de entorno requeridas: JWT_SECRET`

- [ ] **Step 4: Confirm the salt is no longer hardcoded**

Run: `grep -n "tiptop-hlfe" src/utils/Utils.js`
Expected: no output (string no longer present in source).

- [ ] **Step 5: Confirm pg/pg-hstore are absent (never were present, per Task 5's correction)**

Run: `grep -n '"pg"' package.json; grep -n '"pg-hstore"' package.json`
Expected: no output.

- [ ] **Step 6: Confirm Swagger UI serves**

Run: `npm test -- tests/smoke/swagger.smoke.test.js`
Expected: PASS (already covered in Task 7, re-confirmed here as part of the final checklist).

- [ ] **Step 7: Confirm readme reflects MySQL, not Postgres**

Run: `grep -in "postgres" readme.md`
Expected: no output.

- [ ] **Step 8: Review the diff against the spec's "Fuera de alcance" list**

Run: `git diff main --stat` (or `git diff trunk --stat` if `main` isn't the merge base)
Expected: only files listed across Tasks 1-8 appear — no controller/service/model files touched except `src/utils/Utils.js` (Task 3, salt only), no route files touched except `auth.routes.js`/`company.routes.js` (Task 7, JSDoc only, no behavior change).

No commit for this task — it's a verification pass. If any step fails, return to the task that owns that file and fix it there (with its own commit), then re-run this task's checklist.

---

## Self-Review Notes

- **Spec coverage:** Testing infra + 10 smoke tests → Tasks 1, 8. Linting → Task 6. Centralized error handling → Task 4. Env validation + secret fix → Tasks 2, 3. Dependency cleanup + readme → Task 5. Swagger → Task 7. Final criteria checklist → Task 9. All six spec sections have an owning task.
- **Placeholder scan:** no TBD/TODO markers; every step has literal file content or an exact command with expected output.
- **Type/interface consistency:** `bootTestApp`/`shutdownTestApp` (Task 1) are consumed with identical signatures in Tasks 7 and 8. `createAuthenticatedUser(app)` (Task 1) is consumed identically in Task 8's eight files. `validateEnv()` (Task 2) and `AppError`/`errorHandler` (Task 4) names match between their creation and their `app.js` wiring steps.
- **MySQL FK-constraint risk during `force: true` sync** (many `belongsTo`/`hasMany` associations in `init.models.js`) is handled explicitly in `tests/helpers/testApp.js` via `SET FOREIGN_KEY_CHECKS`.
- **`initModels()` idempotency risk** (verified empirically: calling it twice throws `"alias ... two separate associations"`) is why `bootTestApp()` requires `../../src/app` (which calls `initModels()` exactly once) rather than calling `initModels()` separately in test helpers.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-23-fase-0-fundamentos-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
