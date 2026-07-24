require('dotenv').config({ path: '.env.test' });
const jwt = require('jsonwebtoken');
const Tokens = require('../../../src/utils/tokens');

describe('tokens utils', () => {
    it('getPasswordRandom devuelve un string de 6 caracteres', () => {
        const pwd = Tokens.getPasswordRandom();
        expect(typeof pwd).toBe('string');
        expect(pwd).toHaveLength(6);
    });

    it('getSessionRandom devuelve un string de 6 caracteres', () => {
        const session = Tokens.getSessionRandom();
        expect(typeof session).toBe('string');
        expect(session).toHaveLength(6);
    });

    it('generateAccessToken firma un JWT HS512 verificable con JWT_SECRET', () => {
        const token = Tokens.generateAccessToken({ id: 1 });
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS512'] });
        expect(decoded.id).toBe(1);
    });

    it('generateRefreshToken firma un JWT HS512 verificable con JWT_REFRESH_SECRET', () => {
        const token = Tokens.generateRefreshToken({ id: 2 });
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS512'] });
        expect(decoded.id).toBe(2);
    });
});
