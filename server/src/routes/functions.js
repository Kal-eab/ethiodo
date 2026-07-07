const express = require('express');
const { requireAdmin } = require('../auth');
const fns = require('../functions');

const router = express.Router();

// Mirrors base44.functions.invoke(name, params) — every one of these functions
// is admin-only, matching the RLS checks the original Deno functions performed.
router.post('/:name', requireAdmin, async (req, res) => {
  const handlers = {
    recalcPopularity: () => fns.recalcPopularity(),
    recalcTrending: () => fns.recalcTrending(),
    getConversionRates: () => fns.getConversionRates(),
    getSlackChannels: () => fns.getSlackChannels(),
  };
  const handler = handlers[req.params.name];
  if (!handler) return res.status(404).json({ error: `Unknown function: ${req.params.name}` });
  try {
    const data = await handler();
    res.json(data);
  } catch (err) {
    const status = err.status || 500;
    // Preserve intentional 4xx/5xx-with-status messages (e.g. "GA not
    // configured"), but never leak a raw uncaught 500's internals.
    const message = err.status ? err.message : 'Internal server error';
    res.status(status).json({ error: message });
  }
});

module.exports = router;
