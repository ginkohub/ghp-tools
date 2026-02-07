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

export default router;