import express from 'express';
import axios from 'axios';

const router = express.Router();

const HOP_BY_HOP_HEADERS = new Set([
    'connection',
    'host',
    'accept-encoding',
    'content-length',
    'transfer-encoding',
    'upgrade',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer'
]);

const PASSTHROUGH_HEADERS = [
    'content-type',
    'cache-control',
    'etag',
    'last-modified',
    'content-language',
    'content-security-policy',
    'set-cookie',
    'location'
];

const isAllowedGithubHost = (hostname) => {
    const normalizedHost = hostname.toLowerCase();
    return normalizedHost === 'github.com' || normalizedHost.endsWith('.github.com');
};

/**
 * @openapi
 * /fetch:
 *   get:
 *     summary: Proxy a GitHub page and return raw HTML
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: GitHub URL to fetch
 *     responses:
 *       200:
 *         description: Raw HTML response from GitHub
 *       400:
 *         description: Invalid or missing URL
 *       502:
 *         description: Failed to fetch the requested URL
 */
router.get('/', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Missing url' });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid url' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Invalid url protocol' });
    }

    if (!isAllowedGithubHost(parsedUrl.hostname)) {
        return res.status(400).json({ error: 'URL host not allowed' });
    }

    const forwardedHeaders = Object.entries(req.headers).reduce((headers, [key, value]) => {
        const lowerKey = key.toLowerCase();
        if (HOP_BY_HOP_HEADERS.has(lowerKey)) {
            return headers;
        }
        if (typeof value !== 'undefined') {
            headers[key] = value;
        }
        return headers;
    }, {});

    if (!forwardedHeaders['user-agent']) {
        forwardedHeaders['user-agent'] = 'Mozilla/5.0';
    }

    try {
        const response = await axios.get(parsedUrl.toString(), {
            headers: forwardedHeaders,
            responseType: 'arraybuffer',
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: () => true
        });

        PASSTHROUGH_HEADERS.forEach((header) => {
            const value = response.headers[header];
            if (typeof value !== 'undefined') {
                res.set(header, value);
            }
        });

        res.status(response.status).send(Buffer.from(response.data));
    } catch (error) {
        res.status(502).json({ error: 'Failed to fetch url' });
    }
});

export default router;
