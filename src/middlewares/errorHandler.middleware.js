const AppError = require('../errors/AppError');

const errorHandler = (err, req, res, next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const code = err instanceof AppError ? err.name : 'INTERNAL_ERROR';

    res.status(statusCode).json({
        error: {
            message: err.message || 'Internal server error',
            code,
        },
    });
};

module.exports = errorHandler;
