import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

import githubRoutes from './src/routes/github.js';
import toolsRoutes from './src/routes/tools.js';
import systemRoutes from './src/routes/system.js';
import imagesRoutes from './src/routes/images.js';
import fetchRoutes from './src/routes/fetch.js';
import commentRoutes from './src/routes/comments.js';

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Basic Health Check (Instant response)
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'GinkoHub Tools API (ESM/Vercel) is running',
        timestamp: new Date().toISOString()
    });
});

// Routes
const mountRoutes = (prefix) => {
    app.use(`${prefix}/github`, githubRoutes);
    app.use(`${prefix}/tools`, toolsRoutes);
    app.use(`${prefix}/system`, systemRoutes);
    app.use(`${prefix}/images`, imagesRoutes);
    app.use(`${prefix}/fetch`, fetchRoutes);
    app.use(`${prefix}/comments`, commentRoutes);
};

// Mount both versions
mountRoutes('/api/v1');
mountRoutes('/api');

// Swagger Docs
const options = {
    definition: {
        openapi: '3.1.0',
        info: { title: 'GinkoHub Tools API', version: '1.0.0' },
        servers: [
            { url: '/api', description: 'Main API' },
            { url: '/api/v1', description: 'Version 1' }
        ],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = await swaggerJsdoc(options);

app.get('/docs-json', (req, res) => {
    res.json(swaggerSpec);
});

app.use('/docs', (req, res, next) => {
    // Only redirect if it is the root path and missing the trailing slash
    // req.path is relative to the mount point '/docs'
    if (req.path === '/' && !req.originalUrl.split('?')[0].endsWith('/')) {
        return res.redirect(301, req.originalUrl.replace('?', '/?').replace(/([^/])$/, '$1/'));
    }
    next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error Handling
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Server Error' });
});

export default app;
