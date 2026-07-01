require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');

const { attachUser } = require('./auth');
const { initRealtime } = require('./realtime');
const { UPLOAD_DIR, router: uploadRouter } = require('./routes/upload');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const { router: entitiesRouter } = require('./routes/entities');
const functionsRouter = require('./routes/functions');
const agentsRouter = require('./routes/agents');
const { recalcPopularity, recalcTrending } = require('./functions');

const app = express();
const server = http.createServer(app);

const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
app.use(cors({ origin: corsOrigins.includes('*') ? '*' : corsOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(attachUser);
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/functions', functionsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/upload', uploadRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

initRealtime(server, corsOrigins.includes('*') ? '*' : corsOrigins);

// Replaces the Base44 scheduled functions for recalcPopularity / recalcTrending.
cron.schedule('0 * * * *', () => {
  recalcPopularity().catch((err) => console.error('recalcPopularity failed:', err));
});
cron.schedule('*/15 * * * *', () => {
  recalcTrending().catch((err) => console.error('recalcTrending failed:', err));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
