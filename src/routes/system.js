import express from 'express';
import os from 'os';
import db from '../lib/db.js';

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

/**
 * @openapi
 * /system/storage:
 *   get:
 *     summary: Check current storage engine
 */
router.get('/storage', (req, res) => {
    const isRedis = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
    res.json({
        engine: isRedis ? 'Upstash Redis (Persistent)' : 'In-Memory (Temporary)',
        env_found: isRedis,
        node_env: process.env.NODE_ENV
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
        const keys = await db.keys('usage:*');
        const stats = {};
        
        for (const key of keys) {
            const val = await db.get(key);
            stats[key.replace('usage:', '')] = val || 0;
        }
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;