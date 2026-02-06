const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Basic Health Check (Instant response)
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'GinkoHub Tools API (CJS/Stable) is running',
        timestamp: new Date().toISOString()
    });
});

// Lazy load routes
app.use('/api/v1/github', require('./src/routes/github.js'));
app.use('/api/v1/tools', require('./src/routes/tools.js'));
app.use('/api/v1/system', require('./src/routes/system.js'));
app.use('/api/v1/images', require('./src/routes/images.js'));

// Swagger Docs (Lazy load to speed up startup)
app.get('/docs-json', (req, res) => {
    const swaggerJsdoc = require('swagger-jsdoc');
    const options = {
        definition: {
            openapi: '3.0.0',
            info: { title: 'GinkoHub Tools API', version: '1.0.0' },
            servers: [{ url: '/api/v1' }],
        },
        apis: ['./src/routes/*.js'],
    };
    res.json(swaggerJsdoc(options));
});

const swaggerUi = require('swagger-ui-express');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, {
    swaggerOptions: { url: '/docs-json' }
}));

// Error Handling
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Server Error' });
});

module.exports = app;
