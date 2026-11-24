class AppError extends Error {
    // `code` opcional: deja al cliente distinguir un aviso que se puede confirmar (p. ej. DUPLICATE_RECORD).
    constructor(message, statusCode = 500, code) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

module.exports = AppError;
