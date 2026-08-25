require('dotenv').config({ path: '.env.test' });

jest.mock('axios');

describe('powerbiAuth.services getPowerBIAccessToken', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.resetModules();
        process.env.POWERBI_TENANT_ID = 'tenant-1';
        process.env.POWERBI_CLIENT_ID = 'client-1';
        process.env.POWERBI_CLIENT_SECRET = 'secret-1';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('requests a token from Azure AD and returns it', async () => {
        const axios = require('axios');
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
        const axios = require('axios');
        axios.post.mockResolvedValueOnce({ data: { access_token: 'token-abc', expires_in: 3600 } });
        const { getPowerBIAccessToken } = require('../../../../src/services/reports/powerbiAuth.services');
        const now = Date.now();

        await getPowerBIAccessToken(now);
        const token = await getPowerBIAccessToken(now + 60 * 1000);

        expect(token).toBe('token-abc');
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('refetches once the cached token is inside the refresh margin', async () => {
        const axios = require('axios');
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
        const axios = require('axios');
        delete process.env.POWERBI_TENANT_ID;
        const { getPowerBIAccessToken } = require('../../../../src/services/reports/powerbiAuth.services');

        await expect(getPowerBIAccessToken()).rejects.toThrow('Power BI no está configurado en el servidor');
        expect(axios.post).not.toHaveBeenCalled();
    });
});
