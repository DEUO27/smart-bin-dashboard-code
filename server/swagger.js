const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'IoT Backend API',
            version: '1.0.0',
            description: 'Simple API for ESP8266/NodeMCU integration',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local server',
            },
        ],
    },
    apis: ['./routes.js'],
};

const openapiSpecification = swaggerJsdoc(options);

module.exports = openapiSpecification;
