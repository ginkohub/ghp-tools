import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

/**
 * @openapi
 * /github/repo/{owner}/{repo}:
 *   get:
 *     summary: Get GitHub repository statistics
 */
router.get('/repo/:owner/:repo', async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const url = `https://github.com/${owner}/${repo}`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const description = $('p.f4.my-3').text().trim();
        const stars = $('#repo-stars-counter-star').attr('title') || '0';
        res.json({ owner, repo, description, stars: stars.replace(/,/g, ''), url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch repo stats' });
    }
});

export default router;