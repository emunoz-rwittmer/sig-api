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
