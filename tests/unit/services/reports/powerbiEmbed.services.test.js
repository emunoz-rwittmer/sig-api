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
