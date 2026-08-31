const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'interno-api',
            version: '1.0.0',
            description: 'API interna de Rolf Wittmer (bar, catalogos, indicadores, inventario, RRHH, etc.)',
        },
        servers: [{ url: '/api' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/**/*.js'],
});

function setupSwagger(app) {
    if (process.env.NODE_ENV === 'production' && process.env.SWAGGER_ENABLED !== 'true') {
        return;
    }
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
