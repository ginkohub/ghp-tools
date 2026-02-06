import express from 'express';
import os from 'os';

const router = express.Router();

/**
 * @openapi
 * /system/info:
 *   get:
 *     summary: Get Server System Information
 */
router.get('/info', (req, res) => {
    res.json({
        platform: os.platform(),
        uptime: os.uptime(),
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            usage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1) + '%'
        }
    });
});

export default router;