import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Redis } from '@upstash/redis';

const router = express.Router();
const redis = Redis.fromEnv();

/**
 * Helper to increment global usage counter
 */
const incrementUsage = async (type) => {
    try {
        await redis.incr(`usage:github:${type}`);
        await redis.incr('usage:total');
    } catch (e) {}
};

/**
 * @openapi
 * /github/repo/{owner}/{repo}:
 *   get:
 *     summary: Get GitHub repository statistics
 */
router.get('/repo/:owner/:repo', async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const cacheKey = `repo:${owner}:${repo}`;
        
        try {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ ...cached, cached: true });
        } catch (e) {}

        const url = `https://github.com/${owner}/${repo}`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const description = $('p.f4.my-3').text().trim();
        const stars = $('#repo-stars-counter-star').attr('title') || '0';
        
        const result = { owner, repo, description, stars: stars.replace(/,/g, ''), url };
        
        try {
            await redis.set(cacheKey, result, { ex: 7200 });
            await incrementUsage('repo');
        } catch (e) {}

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch repo stats' });
    }
});

/**
 * @openapi
 * /github/trending:
 *   get:
 *     summary: Get GitHub trending repositories
 */
router.get('/trending', async (req, res) => {
    try {
        const { language, since = 'daily' } = req.query;
        const langPath = language ? `/${language}` : '';
        const cacheKey = `trending:repos:${language || 'all'}:${since}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json(cached);
        } catch (e) {}

        const url = `https://github.com/trending${langPath}?since=${since}`;
        const { data } = await axios.get(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            } 
        });
        
        const $ = cheerio.load(data);
        const repos = [];

        $('.Box-row').each((i, el) => {
            const $el = $(el);
            const title = $el.find('h2 a').text().replace(/\s+/g, '').trim();
            const [owner, name] = title.split('/');
            const href = $el.find('h2 a').attr('href');
            const description = $el.find('p').text().trim();
            const language = $el.find('[itemprop="programmingLanguage"]').text().trim();
            const stars = $el.find('a[href$="/stargazers"]').text().trim().replace(/,/g, '');
            const forks = $el.find('a[href$="/forks"]').text().trim().replace(/,/g, '');
            const starsToday = $el.find('span.d-inline-block.float-sm-right').text().trim();

            repos.push({
                owner,
                name,
                url: `https://github.com${href}`,
                description,
                language,
                stars: parseInt(stars) || 0,
                forks: parseInt(forks) || 0,
                starsToday
            });
        });

        try {
            await redis.set(cacheKey, repos, { ex: 3600 });
            await incrementUsage('trending');
        } catch (e) {}

        res.json(repos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trending repos' });
    }
});

/**
 * @openapi
 * /github/trending/developers:
 *   get:
 *     summary: Get GitHub trending developers
 */
router.get('/trending/developers', async (req, res) => {
    try {
        const { language, since = 'daily' } = req.query;
        const langPath = language ? `/${language}` : '';
        const cacheKey = `trending:devs:${language || 'all'}:${since}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json(cached);
        } catch (e) {}

        const url = `https://github.com/trending/developers${langPath}?since=${since}`;
        const { data } = await axios.get(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            } 
        });
        
        const $ = cheerio.load(data);
        const developers = [];

        $('.Box-row').each((i, el) => {
            const $el = $(el);
            const name = $el.find('h1.h3.lh-condensed a').text().trim();
            const username = $el.find('p.f4.text-normal a').text().trim();
            const repoName = $el.find('h1.h4.lh-condensed a').text().trim();
            const repoDescription = $el.find('.f6.text-gray.mt-1').text().trim();
            const avatar = $el.find('img.rounded-2').attr('src');

            developers.push({
                name,
                username,
                avatar,
                repo: {
                    name: repoName,
                    description: repoDescription
                }
            });
        });

        try {
            await redis.set(cacheKey, developers, { ex: 3600 });
            await incrementUsage('trending_devs');
        } catch (e) {}

        res.json(developers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trending developers' });
    }
});

/**
 * @openapi
 * /github/user/{username}:
 *   get:
 *     summary: Get GitHub user profile info (scraped)
 */
router.get('/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const cacheKey = `user:${username}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ ...cached, cached: true });
        } catch (e) {}

        const url = `https://github.com/${username}`;
        const { data } = await axios.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const $ = cheerio.load(data);
        
        const name = $('.p-name').text().trim();
        const bio = $('.p-note.user-profile-bio').text().trim();
        const avatar = $('.avatar-user').attr('src');
        const followers = $('.Link--secondary:contains("followers") .text-bold').text().trim();
        const following = $('.Link--secondary:contains("following") .text-bold').text().trim();
        const location = $('.p-label:contains("Location")').parent().text().trim();
        const website = $('.p-label:contains("Website")').parent().text().trim();
        
        const result = {
            username,
            name,
            bio,
            avatar,
            followers,
            following,
            location,
            website,
            url
        };

        try {
            await redis.set(cacheKey, result, { ex: 14400 });
            await incrementUsage('user');
        } catch (e) {}

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

/**
 * @openapi
 * /github/stats:
 *   get:
 *     summary: Get persistent API usage stats
 */
router.get('/stats', async (req, res) => {
    try {
        const keys = [
            'usage:github:repo',
            'usage:github:trending',
            'usage:github:trending_devs',
            'usage:github:user',
            'usage:total'
        ];
        const stats = {};
        for (const key of keys) {
            stats[key.replace('usage:', '')] = await redis.get(key) || 0;
        }
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;