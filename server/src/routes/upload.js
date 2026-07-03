const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { requireAuth } = require('../auth');
const { s3, BUCKET, PUBLIC_URL } = require('../lib/s3');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Mirrors base44.integrations.Core.UploadFile({ file }) -> { file_url }.
// Stores files in an S3-compatible bucket (Cloudflare R2 / AWS S3 / Backblaze
// B2) instead of local disk, since Render's free/standard web services have
// an ephemeral filesystem that gets wiped on every deploy or restart.
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname).slice(0, 10);
  const folder = (req.body.folder || '').replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '');
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const key = folder ? `${folder}/${filename}` : filename;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  }));

  res.status(201).json({ file_url: `${PUBLIC_URL}/${key}` });
});

module.exports = { router };
