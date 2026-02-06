const express = require('express');
const multer = require('multer');
const { Jimp } = require('jimp');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @openapi
 * /images/convert:
 *   post:
 *     summary: Convert an image format (using Jimp)
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
        res.status(500).json({ error: 'Conversion failed', details: error.message });
    }
});

/**
 * @openapi
 * /images/metadata:
 *   post:
 *     summary: Get image metadata
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

module.exports = router;
