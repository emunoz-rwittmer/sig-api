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
