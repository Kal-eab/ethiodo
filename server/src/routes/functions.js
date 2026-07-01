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
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
