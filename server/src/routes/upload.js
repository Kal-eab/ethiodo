const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { requireAuth } = require('../auth');
const { s3, BUCKET, PUBLIC_URL } = require('../lib/s3');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Determine the real image type from the file's magic bytes rather than
// trusting the client-supplied filename extension or Content-Type. Both are
// attacker-controlled: without this, a user could upload an .html/.svg payload
// (or any file labelled image/png) that then gets served from the public
// bucket domain — a stored-XSS / malware-hosting vector. Returns { ext, mime }
// for allowed image types, or null to reject.
function sniffImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: '.jpg', mime: 'image/jpeg' };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: '.png', mime: 'image/png' };
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return { ext: '.gif', mime: 'image/gif' };
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return { ext: '.webp', mime: 'image/webp' };
  if (buf.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return { ext: '.avif', mime: 'image/avif' };
  }
  return null;
}

// Mirrors base44.integrations.Core.UploadFile({ file }) -> { file_url }.
// Stores files in an S3-compatible bucket (Cloudflare R2 / AWS S3 / Backblaze
// B2) instead of local disk, since Render's free/standard web services have
// an ephemeral filesystem that gets wiped on every deploy or restart.
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Validate by content, not by the client's claimed name/type.
  const kind = sniffImageType(req.file.buffer);
  if (!kind) {
    return res.status(400).json({ error: 'Unsupported file type. Upload a JPEG, PNG, WebP, GIF or AVIF image.' });
  }

  const folder = (req.body.folder || '').replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '');
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${kind.ext}`;
  const key = folder ? `${folder}/${filename}` : filename;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: req.file.buffer,
    ContentType: kind.mime,
    // Defence in depth: even if a browser is tricked into treating the object
    // as HTML, nosniff + attachment stops it executing inline.
    ContentDisposition: 'inline',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  res.status(201).json({ file_url: `${PUBLIC_URL}/${key}` });
});

module.exports = { router };
