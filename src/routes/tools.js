import express from 'express';
import QRCode from 'qrcode';
import Parser from 'rss-parser';

const router = express.Router();
const parser = new Parser();

/**
 * @openapi
 * /tools/qr:
 *   get:
 *     summary: Generate a QR Code
 *     description: Returns a Data URI for a QR code image based on the provided text.
 *     parameters:
 *       - in: query
 *         name: text
 *         required: true
 *         schema:
 *           type: string
 *         description: The text or URL to encode in the QR code.
 *     responses:
 *       200:
 *         description: QR Code generated successfully
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
 *     description: Converts an RSS or Atom feed URL into a JSON object.
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: The URL of the RSS/Atom feed.
 *     responses:
 *       200:
 *         description: Parsed feed data
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [encode, decode]
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversion result
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

export default router;
