import express from 'express';
import os from 'os';
import { Redis } from '@upstash/redis';

const router = express.Router();
const redis = Redis.fromEnv();

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

/**
 * @openapi
 * /system/stats:
 *   get:
 *     summary: Get persistent API usage stats from Upstash
 */
router.get('/stats', async (req, res) => {
    try {
        // Fetch all usage keys
        const keys = await redis.keys('usage:*');
        const stats = {};
        
        for (const key of keys) {
            const val = await redis.get(key);
            stats[key.replace('usage:', '')] = val || 0;
        }
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;