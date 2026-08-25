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
