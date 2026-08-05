const AppError = require('../errors/AppError');

const errorHandler = (err, req, res, next) => {
    // Un error posterior al inicio de la respuesta (streams de descarga, por
    // ejemplo) no se puede reportar en el body: res.status() lanzaria
    // ERR_HTTP_HEADERS_SENT. Se delega al finalHandler de Express, que cierra
    // la conexion.
    if (res.headersSent) {
        console.error('Error tras enviar headers:', err);
        return next(err);
    }

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
