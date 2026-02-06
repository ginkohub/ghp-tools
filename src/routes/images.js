import express from 'express';
import multer from 'multer';
import { Jimp } from 'jimp';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @openapi
 * /images/convert:
 *   post:
 *     summary: Convert an image format (using Jimp)
 *     description: Upload an image and convert it. Supports PNG, JPEG, BMP.
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
 */
router.post('/convert', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image' });
        
        const format = req.body.format?.toLowerCase() || 'png';
        const image = await Jimp.read(req.file.buffer);
        
        let mime;
        switch(format) {
            case 'jpg':
            case 'jpeg': mime = 'image/jpeg'; break;
            case 'bmp': mime = 'image/bmp'; break;
            default: mime = 'image/png';
        }

        const buffer = await image.getBuffer(mime);
        res.set('Content-Type', mime).send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Conversion failed', details: error.message });
    }
});

/**
 * @openapi
 * /images/metadata:
 *   post:
 *     summary: Get image metadata
 *     responses:
 *       200:
 *         description: Metadata JSON object
 */
router.post('/metadata', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image' });
        const image = await Jimp.read(req.file.buffer);
        res.json({
            width: image.width,
            height: image.height,
            mime: image.mime
        });
    } catch (error) {
        res.status(500).json({ error: 'Metadata read failed' });
    }
});

export default router;