import express from 'express';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import db from '../lib/db.js';

const router = express.Router();

/**
 * Security: Allowed HTML tags for Markdown comments
 */
const sanitizeOptions = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote' ],
    allowedAttributes: {
        'a': [ 'href', 'name', 'target' ]
    },
    allowedSchemes: [ 'http', 'https' ]
};

/**
 * @openapi
 * /comments/{pageId}:
 *   get:
 *     summary: Fetch comments for a specific page
 */
router.get('/:pageId', async (req, res) => {
    const { pageId } = req.params;
    try {
        const comments = await db.get(`comments:${pageId}`) || [];
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

/**
 * @openapi
 * /comments/{pageId}:
 *   post:
 *     summary: Submit a new Markdown comment
 */
router.post('/:pageId', async (req, res) => {
    const { pageId } = req.params;
    const { author = 'Anonymous', content } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!content || content.trim().length < 2) {
        return res.status(400).json({ error: 'Comment too short' });
    }

    if (content.length > 500) {
        return res.status(400).json({ error: 'Comment too long (max 500 chars)' });
    }

    try {
        // 1. Rate Limiting (1 comment per IP per 60s)
        const rateLimitKey = `ratelimit:comment:${ip.replace(/:/g, '_')}`;
        const isLimited = await db.get(rateLimitKey);
        if (isLimited) {
            return res.status(429).json({ error: 'Too many requests. Wait 60s.' });
        }

        // 2. Process Markdown & Sanitize
        const rawHtml = await marked.parse(content);
        const cleanHtml = sanitizeHtml(rawHtml, sanitizeOptions);

        const newComment = {
            id: Math.random().toString(36).substring(2, 9),
            author: sanitizeHtml(author),
            content: cleanHtml,
            timestamp: new Date().toISOString()
        };

        // 3. Save to Redis (Maintain last 50 comments)
        const comments = await db.get(`comments:${pageId}`) || [];
        comments.unshift(newComment);
        
        const limitedComments = comments.slice(0, 50); // Abuse prevention: cap storage
        await db.set(`comments:${pageId}`, limitedComments);

        // 4. Set Rate Limit
        await db.set(rateLimitKey, '1', { ex: 60 });

        await db.incr('usage:total');
        await db.incr('usage:comments');

        res.json({ success: true, comment: newComment });
    } catch (error) {
        console.error('Comment Error:', error);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

export default router;
