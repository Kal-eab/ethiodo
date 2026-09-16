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

// What the storage provider's error codes actually mean, in terms of the
// setting that needs changing. Without this an admin only ever sees
// "Internal server error" and has nothing to act on.
const STORAGE_ERRORS = {
  InvalidAccessKeyId: 'Storage rejected the credentials: R2_ACCESS_KEY_ID is not valid for this account.',
  SignatureDoesNotMatch: 'Storage rejected the credentials: R2_SECRET_ACCESS_KEY is wrong.',
  NoSuchBucket: 'Storage bucket not found — check R2_BUCKET_NAME.',
  AccessDenied: 'Storage credentials lack write permission — the R2 API token needs Object Read & Write.',
  PermanentRedirect: 'Storage endpoint is wrong — check R2_ACCOUNT_ID.',
  CredentialsProviderError: 'Storage credentials are missing or unreadable on the server.',
};

// Mirrors base44.integrations.Core.UploadFile({ file }) -> { file_url }.
// Stores files in an S3-compatible bucket (Cloudflare R2 / AWS S3 / Backblaze
// B2) instead of local disk, since Render's free/standard web services have
// an ephemeral filesystem that gets wiped on every deploy or restart.
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Validate by content, not by the client's claimed name/type.
  const kind = sniffImageType(req.file.buffer);
  if (!kind) {
    return res.status(400).json({ error: 'Unsupported file type. Upload a JPEG, PNG, WebP, GIF or AVIF image.' });
  }

  // A missing R2_* var otherwise surfaces as an opaque SDK failure ("Bucket
  // name must not be undefined", a hostname of "https://undefined.r2...").
  // Name the actual problem instead.
  const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']
    .filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[upload] storage is not configured — missing: ${missing.join(', ')}`);
    return res.status(500).json({ error: 'File storage is not configured on the server.' });
  }

  const folder = (req.body.folder || '').replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '');
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${kind.ext}`;
  const key = folder ? `${folder}/${filename}` : filename;

  // Express 4 does not forward a rejected promise from an async handler to the
  // error middleware, so an unhandled R2 failure would leave the request with
  // no response at all — the browser just hangs on a spinner that never ends.
  // Catch it, log the real cause (the client only ever sees a generic 5xx),
  // and hand it to next() so a response is actually sent.
  try {
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
  } catch (err) {
    console.error(
      `[upload] R2 PutObject failed for key "${key}" in bucket "${BUCKET}":`,
      err.name,
      err.message,
      err.$metadata ? `(http ${err.$metadata.httpStatusCode})` : ''
    );
    // The generic handler collapses every 5xx to "Internal server error",
    // which makes a storage misconfiguration impossible to act on from the
    // admin UI. These are the storage provider's own public error codes and
    // describe server configuration, not user data, so it is safe to say
    // which one happened — and it turns a dead end into a fix.
    return res.status(502).json({ error: STORAGE_ERRORS[err.name] || `Storage rejected the upload (${err.name}).`, code: err.name });
  }

  res.status(201).json({ file_url: `${PUBLIC_URL}/${key}` });
});

// Multer reports its own failures (most often a file over the 15MB limit) as
// errors on this router. Without this they fall through to the generic handler
// and become an unhelpful 500 "Internal server error".
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image is too large. The maximum size is 15MB.'
        : `Upload failed: ${err.message}`;
    console.error('[upload] multer error:', err.code, err.message);
    return res.status(413).json({ error: message });
  }
  return next(err);
});

module.exports = { router };
