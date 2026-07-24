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
