import { Redis } from '@upstash/redis';

let db;

// Support both Upstash and Vercel KV prefixes
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Check if we should use memory storage
const isDev = process.env.NODE_ENV === 'development' || !redisUrl;

if (isDev) {
    console.log('--- STORAGE: IN-MEMORY MODE ACTIVE (Dev/No-Config) ---');
    const storage = new Map();
    
    db = {
        get: async (key) => storage.get(key),
        set: async (key, value, options) => {
            if (options?.nx && storage.has(key)) return null;
            
            storage.set(key, value);
            if (options?.ex) {
                setTimeout(() => storage.delete(key), options.ex * 1000);
            }
            return 'OK';
        },
        incr: async (key) => {
            const current = (storage.get(key) || 0);
            const next = current + 1;
            storage.set(key, next);
            return next;
        },
        keys: async (pattern) => {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return Array.from(storage.keys()).filter(k => regex.test(k));
        }
    };
} else {
    console.log('--- STORAGE: UPSTASH REDIS ACTIVE (Production) ---');
    const redis = new Redis({
        url: redisUrl,
        token: redisToken,
    });
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
