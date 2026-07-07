require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const { attachUser } = require('./auth');
const { initRealtime } = require('./realtime');
const { router: uploadRouter } = require('./routes/upload');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const { router: entitiesRouter } = require('./routes/entities');
const functionsRouter = require('./routes/functions');
const agentsRouter = require('./routes/agents');
const reviewsRouter = require('./routes/reviews');
const { recalcPopularity, recalcTrending } = require('./functions');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Security headers (nosniff, frameguard, HSTS, referrer-policy, etc.). This is
// a JSON API, so CSP isn't meaningful here and cross-origin resource embedding
// must stay open for the separate frontend origin.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
const allowAllOrigins = corsOrigins.includes('*');
// '*' + credentials is an invalid, browser-rejected combination — only send
// credentialed CORS when an explicit origin allowlist is configured.
app.use(cors({ origin: allowAllOrigins ? '*' : corsOrigins, credentials: !allowAllOrigins }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(attachUser);

app.get('/health', (req, res) => res.json({ ok: true }));

// Brute-force / credential-stuffing guard on the unauthenticated auth
// endpoints — these are the only routes an attacker can hammer without a
// token, so they get their own tighter limiter than the rest of the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/functions', functionsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/reviews', reviewsRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  // Only surface deliberate client-error messages (4xx). Never echo raw 5xx
  // error text to clients — it leaks stack/internal details.
  const message = status < 500 ? err.message || 'Request error' : 'Internal server error';
  res.status(status).json({ error: message });
});

initRealtime(server, corsOrigins.includes('*') ? '*' : corsOrigins);

// Prevents two runs of the same cron job from overlapping and racing on the
// same product rows if a run ever takes longer than its own interval (e.g.
// once the catalog/event log has grown much larger).
function runExclusive(fn, label) {
  let running = false;
  return () => {
    if (running) {
      console.warn(`${label} skipped — previous run still in progress`);
      return;
    }
    running = true;
    fn()
      .catch((err) => console.error(`${label} failed:`, err))
      .finally(() => {
        running = false;
      });
  };
}

// Replaces the Base44 scheduled functions for recalcPopularity / recalcTrending.
cron.schedule('0 * * * *', runExclusive(recalcPopularity, 'recalcPopularity'));
cron.schedule('*/15 * * * *', runExclusive(recalcTrending, 'recalcTrending'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
