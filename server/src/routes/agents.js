const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { prisma } = require('../db');
const { requireAdmin } = require('../auth');
const { emitEntityEvent } = require('../realtime');

const router = express.Router();

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

// Ported from base44/agents/review_insights.jsonc — same persona/instructions,
// now driven by a direct Claude API call instead of Base44's managed agent.
const SYSTEM_PROMPT = `You are a quality insights analyst for an e-commerce store called Ethiodo.
Your job is to analyze customer reviews and provide clear, actionable insights
for administrators.

When asked, you should:

ANALYSIS
1. Read all reviews (especially approved ones)
2. Identify recurring complaints by product, category, and supplier
3. Highlight products with consistently low ratings (below 3 stars)
4. Surface positive trends worth amplifying
5. Flag reviews mentioning: damaged, wrong item, poor quality, sizing issues,
   late delivery, poor packaging, refund requests
6. Detect rating vs review text mismatches (5 stars but negative text)
7. Flag review velocity spikes — sudden flood of negative reviews on one product
8. Identify silent dissatisfaction — high sales, very few reviews

SUPPLIER & PRODUCT INTELLIGENCE
9. Group complaints by supplier, not just individual product
10. Benchmark each product against its category average rating
11. Give extra weight to early reviews on products listed under 30 days
12. Separate product defect complaints from delivery/logistics complaints

REPORTING
13. Score each issue by urgency using: review count + rating severity +
    sales volume + recency. Output a ranked action list
14. Estimate revenue at risk in Birr for critical issues

TRUST & MODERATION
15. Flag suspicious review patterns (same-day bulk 5-stars, identical phrasing)
16. Flag coordinated 1-star attacks (many reviews, no purchase history)

Group all insights by urgency:
- CRITICAL — 1-2 star patterns, refund mentions, supplier-level issues
- WARNING — mixed reviews, delivery complaints, packaging issues
- POSITIVE — 4-5 star patterns, loyalty signals, features to amplify
- ACTION ITEMS — ranked list of what admin should do first

Always be concise, data-driven, and actionable. Reference specific product
names, review counts, and Birr amounts where available.`;

async function buildReviewDigest() {
  const [reviews, products] = await Promise.all([
    prisma.review.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.product.findMany(),
  ]);
  const productById = Object.fromEntries(products.map((p) => [p.id, p.data]));
  const lines = reviews.map((r) => {
    const p = productById[r.data.product_id] || {};
    return `- [${r.data.status}] "${p.name || 'Unknown product'}" (${p.category || 'n/a'}, ${p.price ?? '?'} Birr) — ${r.data.rating}★ — "${(r.data.body || '').slice(0, 300)}"`;
  });
  return lines.join('\n') || '(no reviews yet)';
}

router.post('/review-insights/conversations', requireAdmin, async (req, res) => {
  const conv = await prisma.agentConversation.create({
    data: { userId: req.user.id, agentName: 'review_insights', messages: [] },
  });
  res.status(201).json({ id: conv.id, agent_name: conv.agentName, messages: [] });
});

router.post('/review-insights/conversations/:id/messages', requireAdmin, async (req, res) => {
  const conv = await prisma.agentConversation.findUnique({ where: { id: req.params.id } });
  if (!conv || conv.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

  const { role, content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content is required' });

  const messages = [...conv.messages, { role: role || 'user', content }];

  const digest = await buildReviewDigest();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `${SYSTEM_PROMPT}\n\nCurrent review data (most recent 200):\n${digest}`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const updatedMessages = [...messages, { role: 'assistant', content: text }];
  const updated = await prisma.agentConversation.update({
    where: { id: conv.id },
    data: { messages: updatedMessages },
  });

  emitEntityEvent('AgentConversation', 'update', {
    id: updated.id,
    user_id: req.user.id,
    messages: updated.messages,
  });

  res.json({ id: updated.id, messages: updated.messages });
});

module.exports = router;
