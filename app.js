const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Route Imports
const githubRoutes = require('./src/routes/github.js');
const toolsRoutes = require('./src/routes/tools.js');
const systemRoutes = require('./src/routes/system.js');
const imageRoutes = require('./src/routes/images.js');

const app = express();

// Swagger Config
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'GinkoHub Tools API',
            version: '1.0.0',
            description: 'API for GitHub Pages Tools, hosted on Serv00',
        },
        servers: [
            {
                url: '/api/v1',
                description: 'API v1'
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic Health Check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'GinkoHub Tools API (CJS) is running',
        docs: '/docs',
        config: {
            environment: process.env.NODE_ENV || 'production',
            managed_by: 'Phusion Passenger'
        },
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/v1/github', githubRoutes);
app.use('/api/v1/tools', toolsRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/images', imageRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;