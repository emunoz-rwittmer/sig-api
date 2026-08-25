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
