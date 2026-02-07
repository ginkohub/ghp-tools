import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

/**
 * Helper to extract metadata (Open Graph, Twitter, Standard)
 */
const extractMetadata = (html, url) => {
    const $ = cheerio.load(html);
    
    const getMeta = (name) => 
        $(`meta[property="${name}"]`).attr('content') || 
        $(`meta[name="${name}"]`).attr('content') || 
        null;

    const title = getMeta('og:title') || $('title').text() || '';
    const description = getMeta('og:description') || getMeta('description') || '';
    const image = getMeta('og:image') || getMeta('twitter:image') || $('link[rel="image_src"]').attr('href') || null;
    const siteName = getMeta('og:site_name') || '';
    const icon = $('link[rel="shortcut icon"]').attr('href') || $('link[rel="icon"]').attr('href') || '/favicon.ico';

    // Resolve relative URLs
    const resolveUrl = (relative) => {
        if (!relative) return null;
        try {
            return new URL(relative, url).toString();
        } catch (e) {
            return null;
        }
    };

    return {
        title: title.trim(),
        description: description.trim(),
        image: resolveUrl(image),
        url: resolveUrl(getMeta('og:url')) || url,
        site_name: siteName.trim(),
        icon: resolveUrl(icon)
    };
};

/**
 * @openapi
 * /fetch:
 *   get:
 *     summary: Proxy a GET request to a URL
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: URL to fetch
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, meta]
 *       - in: query
 *         name: headers
 *         schema:
 *           type: string
 *         description: JSON string of custom headers
 *   post:
 *     summary: Proxy a POST request to a URL
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: URL to fetch
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, meta]
 *     requestBody:
 *       description: Data to send in the POST request
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 */
const handleRequest = async (req, res) => {
    const { url, format } = req.query;
    const method = req.method;

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

    const forwardedHeaders = {};

    // 1. Process custom headers from x-proxy-header-* prefix (Highest priority)
    Object.entries(req.headers).forEach(([key, value]) => {
        if (key.toLowerCase().startsWith('x-proxy-header-')) {
            const actualHeader = key.substring(15); // remove 'x-proxy-header-'
            forwardedHeaders[actualHeader] = value;
        }
    });

    // 2. Process headers from query parameter (JSON format)
    const { headers: queryHeadersJson } = req.query;
    if (queryHeadersJson) {
        try {
            const queryHeaders = JSON.parse(queryHeadersJson);
            Object.assign(forwardedHeaders, queryHeaders);
        } catch (e) {
            // Ignore invalid JSON
        }
    }

    // 3. Forward standard headers from the request (Lowest priority, skip hop-by-hop and cookies)
    Object.entries(req.headers).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        // Skip hop-by-hop, proxy-specific headers, and common browser-set headers
        // we skip 'cookie' by default to avoid leaking proxy cookies to target
        if (HOP_BY_HOP_HEADERS.has(lowerKey) || 
            lowerKey.startsWith('x-proxy-') || 
            lowerKey === 'cookie' ||
            lowerKey === 'host') {
            return;
        }
        // Only add if not already set by x-proxy-header or query params
        if (!forwardedHeaders[key]) {
            forwardedHeaders[key] = value;
        }
    });

    if (!forwardedHeaders['user-agent'] && !forwardedHeaders['User-Agent']) {
        forwardedHeaders['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    // Axios retry logic
    const fetchWithRetry = async (retries = 3, delay = 1000) => {
        try {
            return await axios({
                method: method,
                url: parsedUrl.toString(),
                data: req.body,
                headers: forwardedHeaders,
                responseType: 'arraybuffer',
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: () => true
            });
        } catch (err) {
            if (retries > 0 && (err.code === 'ECONNABORTED' || err.code === 'ENOTFOUND' || err.response?.status >= 500)) {
                await new Promise(r => setTimeout(r, delay));
                return fetchWithRetry(retries - 1, delay * 2);
            }
            throw err;
        }
    };

    try {
        const response = await fetchWithRetry();

        // Handle Metadata format request
        if (format === 'meta') {
            const content = Buffer.from(response.data).toString('utf-8');
            const metadata = extractMetadata(content, parsedUrl.toString());
            return res.status(200).json({
                status: 'success',
                data: metadata,
                original_status: response.status
            });
        }

        // Handle JSON format request
        if (format === 'json') {
            const content = Buffer.from(response.data).toString('utf-8');
            return res.status(200).json({
                contents: content,
                status: {
                    url: parsedUrl.toString(),
                    content_type: response.headers['content-type'],
                    http_code: response.status,
                    response_time: response.headers['x-response-time'] || null
                }
            });
        }

        // Standard proxy behavior
        PASSTHROUGH_HEADERS.forEach((header) => {
            const value = response.headers[header];
            if (typeof value !== 'undefined') {
                res.set(header, value);
            }
        });

        res.status(response.status).send(Buffer.from(response.data));
    } catch (error) {
        console.error(`Fetch Error (${method}):`, error.message);
        res.status(502).json({ 
            error: 'Failed to fetch url',
            message: error.message
        });
    }
};

router.get('/', handleRequest);
router.post('/', handleRequest);

export default router;