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
