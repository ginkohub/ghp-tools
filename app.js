import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Route Imports
import githubRoutes from './src/routes/github.js';
import toolsRoutes from './src/routes/tools.js';
import systemRoutes from './src/routes/system.js';
import imageRoutes from './src/routes/images.js';

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
    contentSecurityPolicy: false, // Disable for Swagger UI to load correctly
}));
app.use(cors());
app.use(express.json());

// Docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic Health Check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'GinkoHub Tools API (ESM) is running',
        docs: '/docs',
        config: {
            port: process.env.PORT || 'Passenger managed',
            host: process.env.HOST || 'Passenger managed'
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

export default app;
