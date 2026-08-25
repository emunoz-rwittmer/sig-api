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
