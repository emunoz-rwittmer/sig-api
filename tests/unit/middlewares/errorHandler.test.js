const errorHandler = require('../../../src/middlewares/errorHandler.middleware');
const AppError = require('../../../src/errors/AppError');

function mockRes() {
    return {
        statusCode: null,
        body: null,
        headersSent: false,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

describe('errorHandler middleware', () => {
    it('responds with the AppError statusCode and name as code', () => {
        const res = mockRes();
        const err = new AppError('No encontrado', 404);

        errorHandler(err, {}, res, () => {});

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: { message: 'No encontrado', code: 'AppError' } });
    });

    it('defaults to 500/INTERNAL_ERROR for a plain Error', () => {
        const res = mockRes();
        const err = new Error('boom');

        errorHandler(err, {}, res, () => {});

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ error: { message: 'boom', code: 'INTERNAL_ERROR' } });
    });

    it('delega a next cuando los headers ya se enviaron', () => {
        const res = mockRes();
        res.headersSent = true;
        res.json = () => { throw new Error('no debe responder'); };
        const next = jest.fn();

        errorHandler(new Error('boom'), {}, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBeNull();
    });
});
