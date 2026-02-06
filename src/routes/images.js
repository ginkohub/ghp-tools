import express from 'express';
import multer from 'multer';
import sharp from 'sharp';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @openapi
 * /images/convert:
 *   post:
 *     summary: Convert an image format
 *     description: Upload an image and convert it to a different format (png, webp, jpeg, avif).
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               format:
 *                 type: string
 *                 default: png
 *     responses:
 *       200:
 *         description: Converted image file
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/convert', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image' });
        const format = req.body.format || 'png';
        const buffer = await sharp(req.file.buffer).toFormat(format).toBuffer();
        res.set('Content-Type', `image/${format}`).send(buffer);
    } catch (error) {
        res.status(500).json({ error: 'Conversion failed' });
    }
});

/**
 * @openapi
 * /images/metadata:
 *   post:
 *     summary: Get image metadata
 *     description: Upload an image to retrieve its dimensions, format, and other details.
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Metadata JSON object
 */
router.post('/metadata', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image' });
        const metadata = await sharp(req.file.buffer).metadata();
        res.json(metadata);
    } catch (error) {
        res.status(500).json({ error: 'Metadata read failed' });
    }
});

export default router;
