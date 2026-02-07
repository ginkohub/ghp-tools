import { Redis } from '@upstash/redis';

let db;

// Check if we should use memory storage
const isDev = process.env.NODE_ENV === 'development' || !process.env.UPSTASH_REDIS_REST_URL;

if (isDev) {
    console.log('--- STORAGE: IN-MEMORY MODE ACTIVE ---');
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
    db = Redis.fromEnv();
}

export default db;
