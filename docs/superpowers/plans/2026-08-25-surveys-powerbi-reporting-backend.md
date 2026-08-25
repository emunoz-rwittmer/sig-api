# Reportería Power BI (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the two `interno-api` endpoints the already-built `interno-react` Power BI viewer depends on — a JWT-protected embed-token endpoint and an API-key-protected dataset endpoint for Power BI Service's scheduled refresh — following the contract documented in the frontend spec.

**Architecture:** A `powerbiAuth` service caches an Azure AD client-credentials access token (~55 min TTL) for the service principal. A `powerbiEmbed` service uses that token to call the Power BI REST API (`GET .../reports/{id}` + `POST .../GenerateToken`) and returns `{ embedUrl, embedToken, reportId, expiration }`. A `powerbiDataset` service reuses the existing `EvaluationService.getEvaluationsByCompany` query plus the same cargo/yate/puntaje shaping already used for the Excel report, but returns flat JSON rows instead of a workbook. `reportKey → {workspaceId, reportId}` resolves from a JSON env var so future reports need no code change. The dataset route bypasses user JWT auth entirely (it's called by Power BI Service, not a logged-in user) and is protected by a static `X-PowerBI-Key` header instead — this requires moving `/api/reports`'s auth from the blanket `app.use(..., authJwt.verifyToken, ...)` wrapper to per-route middleware, matching the existing pattern already used in `comentCard.routes.js`.

**Tech Stack:** Node.js, Express 4, Sequelize (MySQL), Jest + Supertest, axios (already a dependency, used the same way `cronJobs.controller.js` already calls external HTTP APIs).

**Spec:** `interno-react` repo, `docs/superpowers/specs/2026-08-24-surveys-powerbi-reporting-design.md`, §6 ("Backend — contrato documentado"). Full path on this machine: `D:\emunoz\Rolf Wittmer\Developer - Documentos\rwittmersig.ec\interno-react\.claude\worktrees\surveys-powerbi-reporting\docs\superpowers\specs\2026-08-24-surveys-powerbi-reporting-design.md`. The frontend implementation plan that already consumes this contract: `docs/superpowers/plans/2026-08-24-surveys-powerbi-reporting-frontend.md` in the same repo.

## Global Constraints

- Response shape for the embed endpoint is fixed by the already-shipped frontend: `{ embedUrl: string, embedToken: string, reportId: string, expiration: string (ISO) }`. Field names must match exactly — the frontend's Redux thunk and tests assert on them verbatim.
- First (and for this plan, only) report key is `"desempeno"`.
- The dataset endpoint (`GET /reports/evaluations/powerbi-dataset`) must NOT require the user JWT — it's called unattended by Power BI Service. It uses a static API key via the `X-PowerBI-Key` header instead (spec §6.2).
- The embed endpoint (`GET /reports/powerbi/:reportKey/embed`) keeps the existing JWT (`authJwt.verifyToken`) plus a role check restricted to the same roles as the frontend menu entry: `admin`, `psicologos`, `gerencia_gps`, `gerencia_uio` (spec §6.1, "rol restringido igual que el menú").
- No Power BI secret (tenant/client id/secret) or workspace/report id is hardcoded — all come from environment variables, validated at request time (not at server boot — `POWERBI_*` are optional so the server keeps booting in environments where this feature isn't configured yet, e.g. local dev/tests that don't exercise it).
- The `reportKey → {workspaceId, reportId}` map lives in a single JSON env var (`POWERBI_REPORTS_MAP`), not a DB table — this is the smallest thing that satisfies "config extensible, no hardcodeada por ruta" from spec §6.1 step 1. A DB-backed catalog can replace it later without changing the service's public function signature.
- Follow existing patterns exactly: `AppError` + the shared `errorHandler` middleware for thrown errors (see `src/controllers/reports/generateGeneralReportEvaluations.js`, `src/errors/AppError.js`, `src/middlewares/errorHandler.middleware.js` — response shape `{ error: { message, code } }`); direct `axios` calls for external HTTP (see `src/controllers/cronJobs.controller.js`); Jest + Supertest domain tests booting the real app via `tests/helpers/testApp.js` (see `tests/domain/reports/reports.test.js`); `@openapi` JSDoc blocks on every route in `reports.routes.js`.
- Test env: local `.env.test` already has `POWERBI_DATASET_API_KEY=test-powerbi-dataset-key` appended (gitignored, not part of this plan's commits) so the dataset-endpoint tests have a key to authenticate with.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/config/powerbi.config.js` | Resolve `reportKey → {workspaceId, reportId}` from `POWERBI_REPORTS_MAP` (JSON env var). |
| `src/services/reports/powerbiAuth.services.js` | Fetch + cache (~55 min) an Azure AD access token via client-credentials for the Power BI service principal. |
| `src/services/reports/powerbiEmbed.services.js` | Resolve a report's embed config (`embedUrl`, `embedToken`, `reportId`, `expiration`) by calling the Power BI REST API. |
| `src/services/reports/powerbiDataset.services.js` | Build the flat JSON dataset rows for Power BI's scheduled refresh, reusing `EvaluationService.getEvaluationsByCompany` + the cargo/yate/puntaje shaping already used by the Excel report. |
| `src/controllers/reports/powerbi.controller.js` | HTTP layer for both new endpoints. |
| `src/middlewares/apiKey.middleware.js` | `verifyPowerBIDatasetKey` — static `X-PowerBI-Key` header check. |
| `src/middlewares/auth.middleware.js` | Modify: add `hasAnyRole(allowedRoles)` middleware factory. |
| `src/routes/reports/reports.routes.js` | Modify: move `authJwt.verifyToken` from the router mount to per-route; add the two new routes with their own auth. |
| `src/routes/index.js` | Modify: mount `/api/reports` without the blanket `authJwt.verifyToken` (now per-route inside `reports.routes.js`). |
| `.env.example` | Modify: document the new `POWERBI_*` variables. |

---

### Task 1: `powerbi.config.js` — report key resolution

**Files:**
- Create: `src/config/powerbi.config.js`
- Test: `tests/unit/config/powerbi.config.test.js`

**Interfaces:**
- Produces: `getReportConfig(reportKey)` → `{ workspaceId: string, reportId: string } | null`. Reads `process.env.POWERBI_REPORTS_MAP` (JSON string) fresh on every call. Used by Task 5's `powerbiEmbed.services.js`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/config/powerbi.config.test.js
require('dotenv').config({ path: '.env.test' });
const { getReportConfig } = require('../../../src/config/powerbi.config');

describe('powerbi.config getReportConfig', () => {
    const original = process.env.POWERBI_REPORTS_MAP;

    afterEach(() => {
        process.env.POWERBI_REPORTS_MAP = original;
    });

    it('returns the workspaceId/reportId pair for a known key', () => {
        process.env.POWERBI_REPORTS_MAP = JSON.stringify({
            desempeno: { workspaceId: 'ws-1', reportId: 'rep-1' },
        });

        expect(getReportConfig('desempeno')).toEqual({ workspaceId: 'ws-1', reportId: 'rep-1' });
    });

    it('returns null for an unknown key', () => {
        process.env.POWERBI_REPORTS_MAP = JSON.stringify({
            desempeno: { workspaceId: 'ws-1', reportId: 'rep-1' },
        });

        expect(getReportConfig('otro-reporte')).toBeNull();
    });

    it('returns null when the env var is missing', () => {
        delete process.env.POWERBI_REPORTS_MAP;

        expect(getReportConfig('desempeno')).toBeNull();
    });

    it('returns null when the env var is malformed JSON', () => {
        process.env.POWERBI_REPORTS_MAP = '{not-json';

        expect(getReportConfig('desempeno')).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/config/powerbi.config.test.js`
Expected: FAIL — `src/config/powerbi.config.js` does not exist.

- [ ] **Step 3: Write the implementation**

```js
// src/config/powerbi.config.js
function getReportsMap() {
    const raw = process.env.POWERBI_REPORTS_MAP;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch {
        return {};
    }
}

function getReportConfig(reportKey) {
    const map = getReportsMap();
    return map[reportKey] || null;
}

module.exports = { getReportConfig };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/config/powerbi.config.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config/powerbi.config.js tests/unit/config/powerbi.config.test.js
git commit -m "feat: add powerbi report key config resolver"
```

---

### Task 2: `apiKey.middleware.js` — dataset endpoint auth

**Files:**
- Create: `src/middlewares/apiKey.middleware.js`
- Test: `tests/unit/middlewares/apiKey.middleware.test.js`

**Interfaces:**
- Produces: `verifyPowerBIDatasetKey(req, res, next)` — Express middleware. Reads `req.headers['x-powerbi-key']`, compares against `process.env.POWERBI_DATASET_API_KEY`. Used by Task 8's route wiring.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/middlewares/apiKey.middleware.test.js
require('dotenv').config({ path: '.env.test' });
const { verifyPowerBIDatasetKey } = require('../../../src/middlewares/apiKey.middleware');

function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

describe('apiKey.middleware verifyPowerBIDatasetKey', () => {
    const originalKey = process.env.POWERBI_DATASET_API_KEY;

    afterEach(() => {
        process.env.POWERBI_DATASET_API_KEY = originalKey;
    });

    it('calls next() when the header matches the configured key', () => {
        process.env.POWERBI_DATASET_API_KEY = 'secret-key';
        const req = { headers: { 'x-powerbi-key': 'secret-key' } };
        const res = mockRes();
        let nextCalled = false;

        verifyPowerBIDatasetKey(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(true);
        expect(res.statusCode).toBeNull();
    });

    it('returns 401 when the header is missing', () => {
        process.env.POWERBI_DATASET_API_KEY = 'secret-key';
        const req = { headers: {} };
        const res = mockRes();
        let nextCalled = false;

        verifyPowerBIDatasetKey(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
    });

    it('returns 401 when the header does not match', () => {
        process.env.POWERBI_DATASET_API_KEY = 'secret-key';
        const req = { headers: { 'x-powerbi-key': 'wrong-key' } };
        const res = mockRes();
        let nextCalled = false;

        verifyPowerBIDatasetKey(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
    });

    it('returns 500 when the server has no key configured', () => {
        delete process.env.POWERBI_DATASET_API_KEY;
        const req = { headers: { 'x-powerbi-key': 'anything' } };
        const res = mockRes();
        let nextCalled = false;

        verifyPowerBIDatasetKey(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(500);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/middlewares/apiKey.middleware.test.js`
Expected: FAIL — `src/middlewares/apiKey.middleware.js` does not exist.

- [ ] **Step 3: Write the implementation**

```js
// src/middlewares/apiKey.middleware.js
const verifyPowerBIDatasetKey = (req, res, next) => {
    const expectedKey = process.env.POWERBI_DATASET_API_KEY;

    if (!expectedKey) {
        return res.status(500).json({ data: 'Power BI dataset key no configurada' });
    }

    const providedKey = req.headers['x-powerbi-key'];
    if (!providedKey || providedKey !== expectedKey) {
        return res.status(401).json({ data: 'API key inválida' });
    }

    return next();
};

module.exports = { verifyPowerBIDatasetKey };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/middlewares/apiKey.middleware.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/middlewares/apiKey.middleware.js tests/unit/middlewares/apiKey.middleware.test.js
git commit -m "feat: add static api key middleware for powerbi dataset endpoint"
```

---

### Task 3: `hasAnyRole` middleware

**Files:**
- Modify: `src/middlewares/auth.middleware.js`
- Test: `tests/unit/middlewares/hasAnyRole.middleware.test.js`

**Interfaces:**
- Consumes: `req.userRol` (already set by `verifyToken`, see `src/middlewares/auth.middleware.js:17`).
- Produces: `authJwt.hasAnyRole(allowedRoles: string[])` → Express middleware factory. Used by Task 8's route wiring for the embed endpoint.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/middlewares/hasAnyRole.middleware.test.js
require('dotenv').config({ path: '.env.test' });
const { hasAnyRole } = require('../../../src/middlewares/auth.middleware');

function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

describe('auth.middleware hasAnyRole', () => {
    it('calls next() when the user role is in the allowed list', async () => {
        const middleware = hasAnyRole(['admin', 'psicologos']);
        const req = { userRol: 'psicologos' };
        const res = mockRes();
        let nextCalled = false;

        await middleware(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(true);
        expect(res.statusCode).toBeNull();
    });

    it('returns 403 when the user role is not in the allowed list', async () => {
        const middleware = hasAnyRole(['admin', 'psicologos']);
        const req = { userRol: 'rrhh' };
        const res = mockRes();
        let nextCalled = false;

        await middleware(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/middlewares/hasAnyRole.middleware.test.js`
Expected: FAIL — `hasAnyRole` is not exported from `auth.middleware.js`.

- [ ] **Step 3: Write the implementation**

In `src/middlewares/auth.middleware.js`, add after `isAdminOfSurveys` (currently ends at line 61):

```js
const hasAnyRole = (allowedRoles) => async (req, res, next) => {
    if (allowedRoles.includes(req.userRol)) {
        return next();
    }
    return res.status(403).json({ data: 'Rol no autorizado' });
};
```

And add it to the exported object (currently lines 63-67):

```js
const authJwt = {
    verifyToken,
    isAdmin,
    isAdminOfSurveys,
    hasAnyRole
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/middlewares/hasAnyRole.middleware.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the existing auth middleware test to confirm no regression**

Run: `npx jest tests/unit/middlewares/auth.middleware.test.js`
Expected: PASS (1 test, unchanged)

- [ ] **Step 6: Commit**

```bash
git add src/middlewares/auth.middleware.js tests/unit/middlewares/hasAnyRole.middleware.test.js
git commit -m "feat: add hasAnyRole middleware for role-restricted routes"
```

---

### Task 4: `powerbiAuth.services.js` — cached Azure AD token

**Files:**
- Create: `src/services/reports/powerbiAuth.services.js`
- Test: `tests/unit/services/reports/powerbiAuth.services.test.js`

**Interfaces:**
- Consumes: `axios` (npm, already a dependency); `AppError` from `../../errors/AppError`; env vars `POWERBI_TENANT_ID`, `POWERBI_CLIENT_ID`, `POWERBI_CLIENT_SECRET`.
- Produces: `getPowerBIAccessToken(now = Date.now())` → `Promise<string>` (the bearer token). Caches in a module-level variable across calls within the process; a call within the cache window skips the HTTP request. Used by Task 5's `powerbiEmbed.services.js`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/services/reports/powerbiAuth.services.test.js
require('dotenv').config({ path: '.env.test' });
const axios = require('axios');

jest.mock('axios');

describe('powerbiAuth.services getPowerBIAccessToken', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env.POWERBI_TENANT_ID = 'tenant-1';
        process.env.POWERBI_CLIENT_ID = 'client-1';
        process.env.POWERBI_CLIENT_SECRET = 'secret-1';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('requests a token from Azure AD and returns it', async () => {
        axios.post.mockResolvedValueOnce({ data: { access_token: 'token-abc', expires_in: 3600 } });
        const { getPowerBIAccessToken } = require('../../../../src/services/reports/powerbiAuth.services');

        const token = await getPowerBIAccessToken();

        expect(token).toBe('token-abc');
        expect(axios.post).toHaveBeenCalledWith(
            'https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token',
            expect.any(String),
            expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' }) })
        );
        const [, body] = axios.post.mock.calls[0];
        expect(body).toContain('grant_type=client_credentials');
        expect(body).toContain('client_id=client-1');
        expect(body).toContain('client_secret=secret-1');
        expect(body).toContain('scope=https%3A%2F%2Fanalysis.windows.net%2Fpowerbi%2Fapi%2F.default');
    });

    it('reuses the cached token on a second call within the TTL', async () => {
        axios.post.mockResolvedValueOnce({ data: { access_token: 'token-abc', expires_in: 3600 } });
        const { getPowerBIAccessToken } = require('../../../../src/services/reports/powerbiAuth.services');
        const now = Date.now();

        await getPowerBIAccessToken(now);
        const token = await getPowerBIAccessToken(now + 60 * 1000);

        expect(token).toBe('token-abc');
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('refetches once the cached token is inside the refresh margin', async () => {
        axios.post
            .mockResolvedValueOnce({ data: { access_token: 'token-abc', expires_in: 3600 } })
            .mockResolvedValueOnce({ data: { access_token: 'token-def', expires_in: 3600 } });
        const { getPowerBIAccessToken } = require('../../../../src/services/reports/powerbiAuth.services');
        const now = Date.now();

        await getPowerBIAccessToken(now);
        const token = await getPowerBIAccessToken(now + 56 * 60 * 1000);

        expect(token).toBe('token-def');
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('throws an AppError when the service principal env vars are missing', async () => {
        delete process.env.POWERBI_TENANT_ID;
        const { getPowerBIAccessToken } = require('../../../../src/services/reports/powerbiAuth.services');

        await expect(getPowerBIAccessToken()).rejects.toThrow('Power BI no está configurado en el servidor');
        expect(axios.post).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/services/reports/powerbiAuth.services.test.js`
Expected: FAIL — `src/services/reports/powerbiAuth.services.js` does not exist.

- [ ] **Step 3: Write the implementation**

```js
// src/services/reports/powerbiAuth.services.js
const axios = require('axios');
const AppError = require('../../errors/AppError');

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let cachedToken = null;
let cachedExpiresAt = 0;

async function getPowerBIAccessToken(now = Date.now()) {
    if (cachedToken && now < cachedExpiresAt - REFRESH_MARGIN_MS) {
        return cachedToken;
    }

    const { POWERBI_TENANT_ID, POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET } = process.env;
    if (!POWERBI_TENANT_ID || !POWERBI_CLIENT_ID || !POWERBI_CLIENT_SECRET) {
        throw new AppError('Power BI no está configurado en el servidor', 500);
    }

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: POWERBI_CLIENT_ID,
        client_secret: POWERBI_CLIENT_SECRET,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
    }).toString();

    const response = await axios.post(
        `https://login.microsoftonline.com/${POWERBI_TENANT_ID}/oauth2/v2.0/token`,
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    cachedToken = response.data.access_token;
    cachedExpiresAt = now + response.data.expires_in * 1000;
    return cachedToken;
}

module.exports = { getPowerBIAccessToken };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/services/reports/powerbiAuth.services.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/powerbiAuth.services.js tests/unit/services/reports/powerbiAuth.services.test.js
git commit -m "feat: add cached azure ad token fetch for powerbi service principal"
```

---

### Task 5: `powerbiEmbed.services.js` — embed config assembly

**Files:**
- Create: `src/services/reports/powerbiEmbed.services.js`
- Test: `tests/unit/services/reports/powerbiEmbed.services.test.js`

**Interfaces:**
- Consumes: `getReportConfig(reportKey)` from Task 1's `../../config/powerbi.config`; `getPowerBIAccessToken()` from Task 4's `./powerbiAuth.services`; `axios`; `AppError`.
- Produces: `getReportEmbedConfig(reportKey)` → `Promise<{ embedUrl, embedToken, reportId, expiration }>`. Throws `AppError('...', 404)` for an unconfigured `reportKey`. Used by Task 6's controller.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/services/reports/powerbiEmbed.services.test.js
require('dotenv').config({ path: '.env.test' });
const axios = require('axios');

jest.mock('axios');
jest.mock('../../../../src/services/reports/powerbiAuth.services', () => ({
    getPowerBIAccessToken: jest.fn(),
}));
jest.mock('../../../../src/config/powerbi.config', () => ({
    getReportConfig: jest.fn(),
}));

const { getPowerBIAccessToken } = require('../../../../src/services/reports/powerbiAuth.services');
const { getReportConfig } = require('../../../../src/config/powerbi.config');
const { getReportEmbedConfig } = require('../../../../src/services/reports/powerbiEmbed.services');

describe('powerbiEmbed.services getReportEmbedConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('assembles the embed config from the report info and GenerateToken calls', async () => {
        getReportConfig.mockReturnValue({ workspaceId: 'ws-1', reportId: 'rep-1' });
        getPowerBIAccessToken.mockResolvedValue('aad-token');
        axios.get.mockResolvedValueOnce({
            data: { id: 'rep-1', embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=rep-1' },
        });
        axios.post.mockResolvedValueOnce({
            data: { token: 'embed-token-abc', tokenId: 't-1', expiration: '2026-08-25T15:00:00Z' },
        });

        const result = await getReportEmbedConfig('desempeno');

        expect(result).toEqual({
            embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=rep-1',
            embedToken: 'embed-token-abc',
            reportId: 'rep-1',
            expiration: '2026-08-25T15:00:00Z',
        });
        expect(axios.get).toHaveBeenCalledWith(
            'https://api.powerbi.com/v1.0/myorg/groups/ws-1/reports/rep-1',
            { headers: { Authorization: 'Bearer aad-token' } }
        );
        expect(axios.post).toHaveBeenCalledWith(
            'https://api.powerbi.com/v1.0/myorg/groups/ws-1/reports/rep-1/GenerateToken',
            { accessLevel: 'View' },
            { headers: { Authorization: 'Bearer aad-token' } }
        );
    });

    it('throws a 404 AppError for an unconfigured report key', async () => {
        getReportConfig.mockReturnValue(null);

        await expect(getReportEmbedConfig('inexistente')).rejects.toMatchObject({
            statusCode: 404,
        });
        expect(getPowerBIAccessToken).not.toHaveBeenCalled();
        expect(axios.get).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/services/reports/powerbiEmbed.services.test.js`
Expected: FAIL — `src/services/reports/powerbiEmbed.services.js` does not exist.

- [ ] **Step 3: Write the implementation**

```js
// src/services/reports/powerbiEmbed.services.js
const axios = require('axios');
const AppError = require('../../errors/AppError');
const { getReportConfig } = require('../../config/powerbi.config');
const { getPowerBIAccessToken } = require('./powerbiAuth.services');

const POWERBI_API_BASE = 'https://api.powerbi.com/v1.0/myorg';

async function getReportEmbedConfig(reportKey) {
    const reportConfig = getReportConfig(reportKey);
    if (!reportConfig) {
        throw new AppError(`Reporte '${reportKey}' no configurado`, 404);
    }
    const { workspaceId, reportId } = reportConfig;
    const accessToken = await getPowerBIAccessToken();
    const authHeaders = { headers: { Authorization: `Bearer ${accessToken}` } };

    const reportRes = await axios.get(
        `${POWERBI_API_BASE}/groups/${workspaceId}/reports/${reportId}`,
        authHeaders
    );

    const tokenRes = await axios.post(
        `${POWERBI_API_BASE}/groups/${workspaceId}/reports/${reportId}/GenerateToken`,
        { accessLevel: 'View' },
        authHeaders
    );

    return {
        embedUrl: reportRes.data.embedUrl,
        embedToken: tokenRes.data.token,
        reportId: reportRes.data.id,
        expiration: tokenRes.data.expiration,
    };
}

module.exports = { getReportEmbedConfig };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/services/reports/powerbiEmbed.services.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/powerbiEmbed.services.js tests/unit/services/reports/powerbiEmbed.services.test.js
git commit -m "feat: add powerbi embed config service"
```

---

### Task 6: `powerbiDataset.services.js` — dataset rows for scheduled refresh

**Files:**
- Create: `src/services/reports/powerbiDataset.services.js`
- Test: `tests/domain/reports/powerbiDataset.services.test.js` (integration, real DB — mirrors the fixtures already used in `tests/domain/reports/reports.test.js`)

**Interfaces:**
- Consumes: `EvaluationService.getEvaluationsByCompany` from `../operations/surveys/evaluations.services` (existing, `src/services/operations/surveys/evaluations.services.js:97`); `Staffervice.getPositionsByFullNames` from `../catalogs/staff.services` (existing); `SurveyScoring.asignarPuntaje` from `../../utils/surveyScoring` (existing); `extractApellido`, `extractNombres`, `capitalizeYachtName` from `../../utils/reportFormatting` (existing).
- Produces: `getEvaluationsDatasetRows()` → `Promise<Array<{ formulario, evaluador, evaluado, cargo, yate, fecha, estado, pregunta1..pregunta10 }>>`. Used by Task 7's controller. `fecha` is an ISO string or `null`; `preguntaN` is `number | string | null`, matching `asignarPuntaje`'s return type.

- [ ] **Step 1: Write the failing test**

```js
// tests/domain/reports/powerbiDataset.services.test.js
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Form = require('../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../src/models/operations/surveys/formAnswers.models');
const { getEvaluationsDatasetRows } = require('../../../src/services/reports/powerbiDataset.services');

let fixtureCounter = 0;
const suffix = () => {
    fixtureCounter += 1;
    return `${Date.now()}-${fixtureCounter}`;
};

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('powerbiDataset.services getEvaluationsDatasetRows', () => {
    it('returns a flat row per evaluation with resolved cargo, capitalized yacht and typed answers', async () => {
        const caseSuffix = suffix();
        const { company } = await createCompanyWithYacht(`PBI Company ${caseSuffix}`, 'TIP TOP III');
        const departament = await createDepartment();
        const position = await createPosition(`Marinero ${caseSuffix}`);
        const evaluatedLastName = `Dataset${caseSuffix} Ramirez`;

        await Staff.create({
            firstName: 'Carla Ines',
            lastName: evaluatedLastName,
            email: `staff-dataset-${caseSuffix}@example.com`,
            cellPhone: '0911111111',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });

        const form = await Form.create({ name: `Form Dataset ${caseSuffix}`, positions: [] });
        const scaleQuestion = await FormQuestion.create({
            formId: form.id,
            title: 'Calificacion general',
            type: 'scale',
        });
        const respond = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'FINALIZADO',
            evaluator: 'Evaluador Dataset',
            evaluated: `Carla Ines ${evaluatedLastName}`,
            expirationDate: new Date('2026-08-01'),
        });
        await FormAnswers.create({ respuestaId: respond.id, questionId: scaleQuestion.id, answer: '5' });

        const rows = await getEvaluationsDatasetRows();
        const row = rows.find((r) => r.evaluado === `Carla Ines ${evaluatedLastName}`);

        expect(row).toBeDefined();
        expect(row.formulario).toBe(form.name);
        expect(row.evaluador).toBe('Evaluador Dataset');
        expect(row.cargo).toBe(position.name);
        expect(row.yate).toBe('Tip Top III');
        expect(row.estado).toBe('FINALIZADO');
        expect(row.pregunta1).toBe(5);
        expect(row.pregunta2).toBeNull();
        expect(typeof row.fecha).toBe('string');
    });

    it('uses "Sin Datos" for cargo when the evaluated name has no staff match', async () => {
        const caseSuffix = suffix();
        const { company } = await createCompanyWithYacht(`PBI NoCargo Company ${caseSuffix}`);
        const form = await Form.create({ name: `Form NoCargo ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta', type: 'text' });
        await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'Pendiente',
            evaluator: 'Evaluador X',
            evaluated: `Persona SinCargo${caseSuffix} Ficticia`,
            expirationDate: new Date('2026-08-01'),
        });

        const rows = await getEvaluationsDatasetRows();
        const row = rows.find((r) => r.evaluado === `Persona SinCargo${caseSuffix} Ficticia`);

        expect(row).toBeDefined();
        expect(row.cargo).toBe('Sin Datos');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/reports/powerbiDataset.services.test.js`
Expected: FAIL — `src/services/reports/powerbiDataset.services.js` does not exist.

- [ ] **Step 3: Write the implementation**

```js
// src/services/reports/powerbiDataset.services.js
const EvaluationService = require('../operations/surveys/evaluations.services');
const Staffervice = require('../catalogs/staff.services');
const SurveyScoring = require('../../utils/surveyScoring');
const { extractApellido, capitalizeYachtName, extractNombres } = require('../../utils/reportFormatting');

async function getEvaluationsDatasetRows() {
    const result = await EvaluationService.getEvaluationsByCompany(undefined, undefined, undefined);

    const uniqueEvaluados = [...new Set(result.map((item) => item.evaluated).filter(Boolean))];
    const namePairs = uniqueEvaluados
        .map((evaluado) => ({
            fullName: evaluado,
            firstName: extractNombres(evaluado),
            lastName: extractApellido(evaluado),
        }))
        .filter(({ firstName, lastName }) => firstName && lastName);

    const cargoByFullName = await Staffervice.getPositionsByFullNames(
        namePairs.map(({ firstName, lastName }) => ({ firstName, lastName }))
    );
    const cargoMap = new Map(
        namePairs.map(({ fullName, firstName, lastName }) => [
            fullName,
            cargoByFullName.get(`${firstName} ${lastName}`) || null,
        ])
    );

    return result.map((item) => {
        const respuestas = item.respuestas?.map((r) => SurveyScoring.asignarPuntaje(r.answer)) || [];
        const row = {
            formulario: item.formulario?.name || 'Sin Datos',
            evaluador: item.evaluator,
            evaluado: item.evaluated,
            cargo: cargoMap.get(item.evaluated) || 'Sin Datos',
            yate: capitalizeYachtName(item.empresa?.yacht?.name) || 'N/A',
            fecha: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
            estado: item.state || 'Sin Datos',
        };
        for (let i = 0; i < 10; i += 1) {
            const respuesta = respuestas[i];
            row[`pregunta${i + 1}`] = (respuesta === undefined || respuesta === '') ? null : respuesta;
        }
        return row;
    });
}

module.exports = { getEvaluationsDatasetRows };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/domain/reports/powerbiDataset.services.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/powerbiDataset.services.js tests/domain/reports/powerbiDataset.services.test.js
git commit -m "feat: add powerbi evaluations dataset service"
```

---

### Task 7: `powerbi.controller.js`

**Files:**
- Create: `src/controllers/reports/powerbi.controller.js`

**Interfaces:**
- Consumes: `getReportEmbedConfig` from Task 5's `../../services/reports/powerbiEmbed.services`; `getEvaluationsDatasetRows` from Task 6's `../../services/reports/powerbiDataset.services`.
- Produces: `getPowerBIEmbedConfig(req, res, next)`, `getEvaluationsPowerBIDataset(req, res, next)` — Express handlers. Used by Task 8's route wiring.

This task has no dedicated unit test — it's a thin pass-through covered end-to-end by Task 8's route tests (which is where auth + wiring correctness actually matters).

- [ ] **Step 1: Write the implementation**

```js
// src/controllers/reports/powerbi.controller.js
const { getReportEmbedConfig } = require('../../services/reports/powerbiEmbed.services');
const { getEvaluationsDatasetRows } = require('../../services/reports/powerbiDataset.services');

const getPowerBIEmbedConfig = async (req, res, next) => {
    try {
        const { reportKey } = req.params;
        const embedConfig = await getReportEmbedConfig(reportKey);
        res.status(200).json(embedConfig);
    } catch (error) {
        next(error);
    }
};

const getEvaluationsPowerBIDataset = async (req, res, next) => {
    try {
        const rows = await getEvaluationsDatasetRows();
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPowerBIEmbedConfig,
    getEvaluationsPowerBIDataset,
};
```

- [ ] **Step 2: Verify the app still builds**

Run: `node -e "require('./src/controllers/reports/powerbi.controller.js')"`
Expected: no output, exit code 0 (module loads without throwing).

- [ ] **Step 3: Commit**

```bash
git add src/controllers/reports/powerbi.controller.js
git commit -m "feat: add powerbi controller for embed and dataset endpoints"
```

---

### Task 8: Route wiring — per-route auth migration + new routes

**Files:**
- Modify: `src/routes/reports/reports.routes.js`
- Modify: `src/routes/index.js:79`
- Test: `tests/domain/reports/powerbi.test.js`

**Interfaces:**
- Consumes: `authJwt.verifyToken`, `authJwt.hasAnyRole` from Task 3's `../../middlewares/auth.middleware`; `verifyPowerBIDatasetKey` from Task 2's `../../middlewares/apiKey.middleware`; `getPowerBIEmbedConfig`, `getEvaluationsPowerBIDataset` from Task 7's `../../controllers/reports/powerbi.controller`.

**Why this task touches every existing route in the file:** today `/api/reports` gets `authJwt.verifyToken` from a single `app.use("/api/reports", authJwt.verifyToken, reportRoutes)` in `src/routes/index.js:79`. The new dataset route must NOT go through that JWT check (spec §6.2 — it authenticates via `X-PowerBI-Key` instead), and Express applies mount-level middleware to every request under that path prefix with no per-route opt-out. The fix is the same one already used in `src/routes/operations/comentCard/comentCard.routes.js`: drop the blanket middleware at the mount point and apply `authJwt.verifyToken` to each route individually inside `reports.routes.js`. This preserves the exact current behavior for every existing route (still JWT-protected, still covered by the existing `tests/domain/reports/reports.test.js` suite) while letting the two new routes declare their own auth.

- [ ] **Step 1: Write the failing tests**

```js
// tests/domain/reports/powerbi.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Form = require('../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../src/models/operations/surveys/formAnswers.models');

jest.mock('axios');
const axios = require('axios');

let app;
let adminToken;
let fixtureCounter = 0;
const suffix = () => {
    fixtureCounter += 1;
    return `${Date.now()}-${fixtureCounter}`;
};

const withAuth = (httpRequest, token) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    adminToken = await createAuthenticatedUser(app);
    process.env.POWERBI_REPORTS_MAP = JSON.stringify({
        desempeno: { workspaceId: 'ws-1', reportId: 'rep-1' },
    });
    process.env.POWERBI_TENANT_ID = 'tenant-1';
    process.env.POWERBI_CLIENT_ID = 'client-1';
    process.env.POWERBI_CLIENT_SECRET = 'secret-1';
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/reports/powerbi/:reportKey/embed', () => {
    it('returns the embed config for an authenticated admin user', async () => {
        axios.post.mockImplementation((url) => {
            if (url.includes('login.microsoftonline.com')) {
                return Promise.resolve({ data: { access_token: 'aad-token', expires_in: 3600 } });
            }
            return Promise.resolve({
                data: { token: 'embed-token-abc', tokenId: 't-1', expiration: '2026-08-25T15:00:00Z' },
            });
        });
        axios.get.mockResolvedValueOnce({
            data: { id: 'rep-1', embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=rep-1' },
        });

        const response = await withAuth(
            request(app).get('/api/reports/powerbi/desempeno/embed'),
            adminToken
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=rep-1',
            embedToken: 'embed-token-abc',
            reportId: 'rep-1',
            expiration: '2026-08-25T15:00:00Z',
        });
    });

    it('returns 403 for a role outside the allowed list', async () => {
        const restrictedToken = jwt.sign({ id: 999, rol: 'rrhh' }, process.env.JWT_SECRET, {
            expiresIn: '10h',
            algorithm: 'HS512',
        });

        const response = await withAuth(
            request(app).get('/api/reports/powerbi/desempeno/embed'),
            restrictedToken
        );

        expect(response.status).toBe(403);
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('returns 403 without a token, same as any other /api/reports route', async () => {
        const response = await request(app).get('/api/reports/powerbi/desempeno/embed');

        expect(response.status).toBe(403);
    });

    it('returns 404 for an unconfigured report key', async () => {
        const response = await withAuth(
            request(app).get('/api/reports/powerbi/otro-reporte/embed'),
            adminToken
        );

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe("Reporte 'otro-reporte' no configurado");
    });
});

describe('GET /api/reports/evaluations/powerbi-dataset', () => {
    it('returns the dataset as JSON when the api key header matches', async () => {
        const caseSuffix = suffix();
        const { company } = await createCompanyWithYacht(`PBI Route Company ${caseSuffix}`);
        const form = await Form.create({ name: `Form Route ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta', type: 'scale' });
        const respond = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'FINALIZADO',
            evaluator: 'Evaluador Route',
            evaluated: 'Evaluado Route',
            expirationDate: new Date('2026-08-01'),
        });
        await FormAnswers.create({ respuestaId: respond.id, questionId: question.id, answer: '4' });

        const response = await request(app)
            .get('/api/reports/evaluations/powerbi-dataset')
            .set('X-PowerBI-Key', process.env.POWERBI_DATASET_API_KEY);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.some((row) => row.evaluado === 'Evaluado Route')).toBe(true);
    });

    it('returns 401 without the api key header', async () => {
        const response = await request(app).get('/api/reports/evaluations/powerbi-dataset');

        expect(response.status).toBe(401);
    });

    it('returns 401 with a JWT instead of the api key (JWT alone is not accepted here)', async () => {
        const response = await withAuth(
            request(app).get('/api/reports/evaluations/powerbi-dataset'),
            adminToken
        );

        expect(response.status).toBe(401);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/domain/reports/powerbi.test.js`
Expected: FAIL — routes `/api/reports/powerbi/:reportKey/embed` and `/api/reports/evaluations/powerbi-dataset` don't exist yet (404s where 200/403/401 are expected).

- [ ] **Step 3: Move auth to per-route in `reports.routes.js` and add the new routes**

In `src/routes/reports/reports.routes.js`, add the new requires after the existing ones (currently lines 1-2):

```js
const { Router } = require('express');
const excelReports = require ('../../controllers/reports');
const powerbiReports = require('../../controllers/reports/powerbi.controller');
const authJwt = require('../../middlewares/auth.middleware');
const { verifyPowerBIDatasetKey } = require('../../middlewares/apiKey.middleware');
const router = Router();

const POWERBI_ALLOWED_ROLES = ['admin', 'psicologos', 'gerencia_gps', 'gerencia_uio'];
```

Add `authJwt.verifyToken` to each of the six existing route registrations (only the registration line changes — the JSDoc blocks above them stay as-is):

```js
router.get('/order/:order_id', authJwt.verifyToken, excelReports.generateOrderExcel);
```
```js
router.post('/stockWarehouse', authJwt.verifyToken, excelReports.generateStockExcel);
```
```js
router.get('/transactions/stock/:stock_id', authJwt.verifyToken, excelReports.generateTransactionsExcel);
```
```js
router.get('/evaluations/generalReport/:company_id', authJwt.verifyToken, excelReports.generateGeneralReportEvaluations);
```
```js
router.post('/evaluations/reportByEmployed', authJwt.verifyToken, excelReports.generatReportEvaluationsByEmployed);
```
```js
router.get('/comentCards/generateReport/:yacht_id', authJwt.verifyToken, excelReports.generateReportComentCards);
```

Then, immediately before `module.exports = router;`, add the two new routes with their swagger docs:

```js
/**
 * @openapi
 * /reports/powerbi/{reportKey}/embed:
 *   get:
 *     summary: Obtener la configuración de embed (token corto) de un reporte Power BI
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Clave del reporte configurada en POWERBI_REPORTS_MAP (ej. "desempeno")
 *     responses:
 *       200:
 *         description: Configuración de embed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 embedUrl:
 *                   type: string
 *                 embedToken:
 *                   type: string
 *                 reportId:
 *                   type: string
 *                 expiration:
 *                   type: string
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 *       404:
 *         description: reportKey no configurado
 */
router.get('/powerbi/:reportKey/embed', authJwt.verifyToken, authJwt.hasAnyRole(POWERBI_ALLOWED_ROLES), powerbiReports.getPowerBIEmbedConfig);

/**
 * @openapi
 * /reports/evaluations/powerbi-dataset:
 *   get:
 *     summary: Dataset JSON de evaluaciones para el refresco programado de Power BI Service
 *     tags: [Reports]
 *     security:
 *       - powerbiApiKey: []
 *     responses:
 *       200:
 *         description: Filas planas de evaluaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: X-PowerBI-Key ausente o inválido
 */
router.get('/evaluations/powerbi-dataset', verifyPowerBIDatasetKey, powerbiReports.getEvaluationsPowerBIDataset);

module.exports = router;
```

In `src/routes/index.js`, change line 79 from:

```js
  app.use("/api/reports", authJwt.verifyToken, reportRoutes);
```

to:

```js
  app.use("/api/reports", reportRoutes);
```

- [ ] **Step 4: Run the new tests to verify they pass**

Run: `npx jest tests/domain/reports/powerbi.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full existing reports suite to confirm no regression from the auth migration**

Run: `npx jest tests/domain/reports/reports.test.js`
Expected: PASS (23 tests, unchanged from the Task 0 baseline)

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/routes/reports/reports.routes.js src/routes/index.js tests/domain/reports/powerbi.test.js
git commit -m "feat: wire powerbi embed and dataset routes, move reports auth per-route"
```

---

### Task 9: Document the new environment variables

**Files:**
- Modify: `.env.example`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Add the new variables**

Append to `.env.example`, after the `SWAGGER_ENABLED` block:

```
# --- Power BI reporting (embed + scheduled dataset refresh) ---
# Azure AD service principal with Power BI Service API permissions (Report.Read.All),
# admin-consented. See docs/superpowers/specs/2026-08-24-surveys-powerbi-reporting-design.md
# §6.3 in the interno-react repo for the manual Azure/Power BI setup steps.
POWERBI_TENANT_ID=
POWERBI_CLIENT_ID=
POWERBI_CLIENT_SECRET=
# JSON map of reportKey -> {workspaceId, reportId}. Add an entry here (no code change)
# to expose a new report through GET /reports/powerbi/:reportKey/embed.
# Example: {"desempeno":{"workspaceId":"<guid>","reportId":"<guid>"}}
POWERBI_REPORTS_MAP=
# Static key Power BI Service must send as the X-PowerBI-Key header when it calls
# GET /reports/evaluations/powerbi-dataset for its scheduled refresh.
POWERBI_DATASET_API_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document powerbi environment variables"
```

---

## Self-Review Notes

- **Spec coverage:** §6.1 (embed endpoint: JWT + restricted roles, config map not hardcoded per-route, cached AAD token, GenerateToken with `accessLevel: "View"`, response shape) → Tasks 1, 3, 4, 5, 7, 8. §6.2 (dataset endpoint: static API key not user JWT, reuses the evaluations query/shaping) → Tasks 2, 6, 7, 8. §6.3 (manual Azure/Power BI setup) is explicitly non-code — referenced from `.env.example` (Task 9) rather than re-implemented. §9 open questions: refresh cadence and role scope are Power BI Service-side config, not backend code (no task needed); the `reportKey → {workspaceId, reportId}` storage question is resolved by this plan as "static env JSON for now" (Task 1), stated explicitly in Global Constraints.
- **Placeholder scan:** no TBD/TODO; every step has runnable commands or complete code.
- **Type consistency:** `getReportConfig(reportKey)` return shape (`{workspaceId, reportId} | null`, Task 1) matches its usage in `powerbiEmbed.services.js` (Task 5). `getPowerBIAccessToken(now)` signature (Task 4) matches its mocked usage in Task 5's test and its real usage in Task 5's implementation. `getReportEmbedConfig` return field names (`embedUrl`, `embedToken`, `reportId`, `expiration`, Task 5) match the controller (Task 7) and the already-shipped frontend contract verbatim (`docs/superpowers/plans/2026-08-24-surveys-powerbi-reporting-frontend.md` in `interno-react`, Task 3's test). `getEvaluationsDatasetRows()` return row shape (Task 6) matches what Task 8's route test asserts (`row.evaluado`). `hasAnyRole(allowedRoles)` (Task 3) matches its call site `authJwt.hasAnyRole(POWERBI_ALLOWED_ROLES)` in Task 8. `verifyPowerBIDatasetKey` (Task 2) matches its route usage in Task 8.
- **Auth-migration risk called out explicitly:** Task 8 is the only task that touches previously-untouched, already-tested routes (the six existing `reports.routes.js` endpoints). Step 5 of Task 8 re-runs the full pre-existing `reports.test.js` suite specifically to catch any regression from moving `authJwt.verifyToken` off the router mount and onto each route individually.
