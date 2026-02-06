const express = require('express');
const QRCode = require('qrcode');
const Parser = require('rss-parser');

const router = express.Router();
const parser = new Parser();

/**
 * @openapi
 * /tools/ip:
 *   get:
 *     summary: Get Client IP Address
 */
router.get('/ip', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
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
router.post('/base64', (req, res) => {
    const { action, text } = req.body;
    if (!text || !action) return res.status(400).json({ error: 'Missing text or action' });
    try {
        let result = action === 'encode' 
            ? Buffer.from(text).toString('base64') 
            : Buffer.from(text, 'base64').toString('utf-8');
        res.json({ result });
    } catch (error) {
        res.status(400).json({ error: 'Conversion failed' });
    }
});

module.exports = router;