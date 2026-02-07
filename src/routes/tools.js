import express from 'express';
import QRCode from 'qrcode';
import Parser from 'rss-parser';
import { marked } from 'marked';
import { Redis } from '@upstash/redis';

const router = express.Router();
const parser = new Parser();
const redis = Redis.fromEnv();

/**
 * Helper to increment global usage counter
 */
const trackUsage = async (tool) => {
    try {
        await redis.incr(`usage:tools:${tool}`);
        await redis.incr('usage:total');
    } catch (e) {
        // Silently fail in dev if KV not configured
    }
};

/**
 * @openapi
 * /tools/ip:
 *   get:
 *     summary: Get Client IP Address
 */
router.get('/ip', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await trackUsage('ip');
    res.json({ ip: ip.split(',')[0].trim() });
});

/**
 * @openapi
 * /tools/qr:
 *   get:
 *     summary: Generate a QR Code
 */
router.get('/qr', async (req, res) => {
    try {
        const { text } = req.query;
        if (!text) return res.status(400).json({ error: 'Missing text' });
        const qrDataUrl = await QRCode.toDataURL(text);
        await trackUsage('qr');
        res.json({ qr_code: qrDataUrl });
    } catch (error) {
        res.status(500).json({ error: 'QR generation failed' });
    }
});

/**
 * @openapi
 * /tools/rss:
 *   get:
 *     summary: Parse an RSS Feed
 */
router.get('/rss', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'Missing url' });
        const feed = await parser.parseURL(url);
        await trackUsage('rss');
        res.json(feed);
    } catch (error) {
        res.status(500).json({ error: 'RSS parsing failed' });
    }
});

/**
 * @openapi
 * /tools/base64:
 *   post:
 *     summary: Base64 Encode/Decode
 */
router.post('/base64', async (req, res) => {
    const { action, text } = req.body;
    if (!text || !action) return res.status(400).json({ error: 'Missing text or action' });
    try {
        let result = action === 'encode' 
            ? Buffer.from(text).toString('base64') 
            : Buffer.from(text, 'base64').toString('utf-8');
        await trackUsage('base64');
        res.json({ result });
    } catch (error) {
        res.status(400).json({ error: 'Conversion failed' });
    }
});

/**
 * @openapi
 * /tools/markdown:
 *   post:
 *     summary: Convert Markdown to HTML
 */
router.post('/markdown', async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });
    try {
        const html = marked.parse(content);
        await trackUsage('markdown');
        res.json({ html });
    } catch (error) {
        res.status(500).json({ error: 'Markdown parsing failed' });
    }
});

/**
 * @openapi
 * /tools/password:
 *   get:
 *     summary: Generate a random password
 */
router.get('/password', async (req, res) => {
    const length = parseInt(req.query.length) || 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";  
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    await trackUsage('password');
    res.json({ password });
});

/**
 * @openapi
 * /tools/json-validate:
 *   post:
 *     summary: Validate and format JSON
 */
router.post('/json-validate', async (req, res) => {
    const { json } = req.body;
    if (!json) return res.status(400).json({ error: 'Missing json string' });
    try {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        await trackUsage('json');
        res.json({ 
            valid: true, 
            formatted: JSON.stringify(parsed, null, 4) 
        });
    } catch (error) {
        res.json({ valid: false, error: error.message });
    }
});

/**
 * @openapi
 * /tools/convert-unit:
 *   get:
 *     summary: Basic unit converter (temp, length, weight)
 */
router.get('/convert-unit', async (req, res) => {
    const { value, from, to, type } = req.query;
    const v = parseFloat(value);
    if (isNaN(v)) return res.status(400).json({ error: 'Invalid value' });

    let result;
    try {
        if (type === 'temp') {
            if (from === 'C' && to === 'F') result = (v * 9/5) + 32;
            else if (from === 'F' && to === 'C') result = (v - 32) * 5/9;
            else if (from === 'C' && to === 'K') result = v + 273.15;
            else if (from === 'K' && to === 'C') result = v - 273.15;
        } else if (type === 'length') {
            const m = { m: 1, km: 1000, cm: 0.01, mm: 0.001, inch: 0.0254, ft: 0.3048, mi: 1609.34 };
            if (m[from] && m[to]) result = v * m[from] / m[to];
        } else if (type === 'weight') {
            const w = { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495 };
            if (w[from] && w[to]) result = v * w[from] / w[to];
        }

        if (result === undefined) throw new Error('Unsupported conversion');
        await trackUsage('unit_converter');
        res.json({ result: parseFloat(result.toFixed(4)) });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @openapi
 * /tools/text-stats:
 *   post:
 *     summary: Get text statistics (word count, etc.)
 */
router.post('/text-stats', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });
    
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    await trackUsage('text_stats');
    res.json({
        characters: text.length,
        charactersNoSpaces: text.replace(/\s/g, '').length,
        words: words.length,
        lines: text.split(/\r\n|\r|\n/).length,
        readingTime: Math.ceil(words.length / 200) + ' min'
    });
});

/**
 * @openapi
 * /tools/text-transform:
 *   post:
 *     summary: Transform text (uppercase, lowercase, slugify)
 */
router.post('/text-transform', async (req, res) => {
    const { text, type } = req.body;
    if (!text || !type) return res.status(400).json({ error: 'Missing text or type' });
    
    let result;
    switch(type) {
        case 'uppercase': result = text.toUpperCase(); break;
        case 'lowercase': result = text.toLowerCase(); break;
        case 'slugify': 
            result = text.toString().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '')
                .replace(/--+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
            break;
        case 'reverse': result = text.split('').reverse().join(''); break;
        default: return res.status(400).json({ error: 'Invalid type' });
    }
    await trackUsage('text_transform');
    res.json({ result });
});

/**
 * Native SVG Generator for the Hit Counter
 */
const generateSVG = (label, count, theme = 'default') => {
    const themes = {
        default: { bg: '#111', text: '#fff', accent: '#0ea5e9' },
        cyber: { bg: '#000', text: '#0ea5e9', accent: '#0ea5e9' },
        flat: { bg: '#f3f4f6', text: '#1f2937', accent: '#3b82f6' },
        minimal: { bg: 'transparent', text: '#fff', accent: '#fff' }
    };
    
    const t = themes[theme] || themes.default;
    const labelWidth = label.length * 7 + 20;
    const countWidth = count.toString().length * 8 + 20;
    const width = labelWidth + countWidth;

    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20">
        <rect width="${width}" height="20" rx="3" fill="${t.bg}"/>
        <rect width="${labelWidth}" height="20" rx="3" fill="${t.bg}"/>
        <path d="M${labelWidth} 0h${countWidth}v20h-${countWidth}z" fill="${t.accent}"/>
        <g text-anchor="middle" font-family="JetBrains Mono,Verdana,Geneva,sans-serif" font-size="11">
            <text x="${labelWidth/2}" y="14" fill="${t.text}" font-weight="bold">${label.toUpperCase()}</text>
            <text x="${labelWidth + countWidth/2}" y="14" fill="${theme === 'flat' ? '#fff' : '#000'}" font-weight="bold">${count}</text>
        </g>
    </svg>`;
};

/**
 * @openapi
 * /tools/hit-counter/{id}:
 *   get:
 *     summary: The Ultimate Hit Counter (Supports SVG, IP Hashing, and Themes)
 */
router.get('/hit-counter/:id', async (req, res) => {
    const { id } = req.params;
    const { format = 'json', label = 'hits', theme = 'default', uid, mode = 'total' } = req.query;
    
    try {
        const key = `counter:${id}`;
        let visitorId = uid;

        // Auto-Unique via IP Hashing if no UID and mode is unique
        if (!visitorId && mode === 'unique') {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            visitorId = Buffer.from(ip).toString('base64').substring(0, 16);
        }

        let count;
        if (visitorId) {
            const lockKey = `lock:${id}:${visitorId}`;
            const isNew = await redis.set(lockKey, '1', { nx: true, ex: 86400 });
            count = isNew ? await redis.incr(key) : (await redis.get(key) || 0);
        } else {
            count = await redis.incr(key);
        }

        await trackUsage('hit_counter');

        if (format === 'svg' || format === 'badge') {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.send(generateSVG(label, count, theme));
        }

        res.json({ id, count, mode, theme });
    } catch (error) {
        res.status(500).json({ error: 'Counter failed' });
    }
});

export default router;