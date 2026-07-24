describe('validateEnv', () => {
    const REQUIRED_KEYS = [
        'DB_NAME', 'DB_USER', 'DB_HOST', 'DB_PORT', 'DB_PASSWORD',
        'DB_HOST_MONGO', 'DB_USER_MONGO', 'DB_PASSWORD_MONGO', 'DB_NAME_MONGO',
        'JWT_SECRET', 'JWT_REFRESH_SECRET', 'HASHIDS_SALT',
    ];
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('does not throw when all required vars are set', () => {
        REQUIRED_KEYS.forEach((key) => { process.env[key] = 'value'; });
        const validateEnv = require('../../../src/config/env');
        expect(() => validateEnv()).not.toThrow();
    });

    it('throws listing the missing var when one is absent', () => {
        REQUIRED_KEYS.forEach((key) => { process.env[key] = 'value'; });
        delete process.env.JWT_SECRET;
        const validateEnv = require('../../../src/config/env');
        expect(() => validateEnv()).toThrow(/JWT_SECRET/);
    });
});
