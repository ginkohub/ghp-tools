import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

import githubRoutes from './src/routes/github.js';
import toolsRoutes from './src/routes/tools.js';
import systemRoutes from './src/routes/system.js';
import imagesRoutes from './src/routes/images.js';

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

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
        message: 'GinkoHub Tools API (ESM/Vercel) is running',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/v1/github', githubRoutes);
app.use('/api/v1/tools', toolsRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/images', imagesRoutes);

// Swagger Docs
const options = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'GinkoHub Tools API', version: '1.0.0' },
        servers: [{ url: '/api/v1' }],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

app.get('/docs-json', (req, res) => {
    res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error Handling
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Server Error' });
});

export default app;
