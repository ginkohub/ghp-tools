import { Redis } from '@upstash/redis';

let db;

// Check if we should use memory storage
const isDev = process.env.NODE_ENV === 'development' || !process.env.UPSTASH_REDIS_REST_URL;

if (isDev) {
    console.log('--- STORAGE: IN-MEMORY MODE ACTIVE (Dev/No-Config) ---');
    const storage = new Map();
    // ... rest of in-memory implementation
} else {
    console.log('--- STORAGE: UPSTASH REDIS ACTIVE (Production) ---');
    const redis = Redis.fromEnv();
    db = {
        get: async (key) => redis.get(key),
        set: async (key, value, options) => redis.set(key, value, options),
        incr: async (key) => {
            const val = await redis.incr(key);
            return parseInt(val);
        },
        keys: async (pattern) => redis.keys(pattern)
    };
}

export default db;
