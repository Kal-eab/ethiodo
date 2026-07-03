const { prisma } = require('./db');

const WEIGHTS = { purchase: 5, view: 1, wishlist: 2 };

function decayFactor(createdAt) {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 1) return 1.0;
  if (ageDays <= 7) return 0.6;
  if (ageDays <= 14) return 0.25;
  return 0.1;
}

// Ported from base44/functions/recalcPopularity/entry.ts
// Score = Likes×3 + Shares×5 + Views×1 + Orders×10
async function recalcPopularity() {
  const [products, likes, shares] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.productLike.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.productShare.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
  ]);

  const likesMap = {};
  for (const l of likes) likesMap[l.data.product_id] = (likesMap[l.data.product_id] || 0) + 1;
  const sharesMap = {};
  for (const s of shares) sharesMap[s.data.product_id] = (sharesMap[s.data.product_id] || 0) + 1;

  let updated = 0;
  for (const p of products) {
    const l = likesMap[p.id] || 0;
    const s = sharesMap[p.id] || 0;
    const v = p.data.totalViews || 0;
    const o = p.data.totalPurchases || 0;
    const score = l * 3 + s * 5 + v * 1 + o * 10;
    await prisma.product.update({
      where: { id: p.id },
      data: {
        data: {
          ...p.data,
          totalLikes: l,
          totalShares: s,
          popularityScore: score,
          lastScoreUpdatedAt: new Date().toISOString(),
        },
      },
    });
    updated++;
  }
  return { updated };
}

// Ported from base44/functions/recalcTrending/entry.ts
async function recalcTrending() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await prisma.productEvent.findMany({
    where: { createdAt: { gte: cutoff } },
    take: 10000,
  });

  const byProduct = {};
  for (const ev of events) {
    const pid = ev.data.product_id;
    if (!byProduct[pid]) byProduct[pid] = [];
    byProduct[pid].push(ev);
  }

  const scores = {};
  for (const [productId, evList] of Object.entries(byProduct)) {
    let score = 0;
    let purchases = 0;
    let views = 0;
    let wishlists = 0;
    for (const ev of evList) {
      const w = WEIGHTS[ev.data.event_type] || 0;
      const d = decayFactor(ev.createdAt);
      score += w * d;
      if (ev.data.event_type === 'purchase') purchases++;
      if (ev.data.event_type === 'view') views++;
      if (ev.data.event_type === 'wishlist') wishlists++;
    }
    scores[productId] = {
      trendingScore: Math.round(score * 100) / 100,
      totalPurchases: purchases,
      totalViews: views,
      totalWishlists: wishlists,
      lastScoreUpdatedAt: new Date().toISOString(),
    };
  }

  const products = await prisma.product.findMany({ take: 1000 });
  let updated = 0;
  for (const product of products) {
    const s = scores[product.id];
    if (s) {
      await prisma.product.update({ where: { id: product.id }, data: { data: { ...product.data, ...s } } });
      updated++;
    } else if (!product.data.trendingScore) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          data: {
            ...product.data,
            trendingScore: 0,
            totalPurchases: 0,
            totalViews: 0,
            totalWishlists: 0,
            lastScoreUpdatedAt: new Date().toISOString(),
          },
        },
      });
    }
  }
  return { success: true, updated, totalProducts: products.length };
}

// Ported from base44/functions/notifyNewProduct/entry.ts.
// Call this whenever a product transitions draft -> published (see the Product
// update hook in routes/entities.js) instead of relying on a platform automation.
async function notifyNewProduct(product) {
  if (!product || !product.published) return { skipped: true, reason: 'not published' };

  const users = await prisma.user.findMany();
  if (users.length === 0) return { notified: 0 };

  await prisma.$transaction(
    users.map((u) =>
      prisma.userNotification.create({
        data: {
          createdById: null,
          createdByEmail: null,
          data: {
            user_id: u.id,
            user_email: u.email,
            type: 'new_product',
            title: 'New Product Available!',
            body: `${product.name} is now available for ${Number(product.price).toLocaleString()} Birr`,
            product_id: product.id,
            product_name: product.name,
            product_image: product.images?.[0] || '',
            product_price: product.price,
            is_read: false,
          },
        },
      })
    )
  );
  return { notified: users.length };
}

// Recomputes a product's denormalized rating summary from its approved
// reviews. Called whenever a Review's moderation status changes to/from
// 'approved' (see the Review hooks in routes/entities.js).
async function recomputeProductRating(productId) {
  if (!productId) return;
  const reviews = await prisma.review.findMany({
    where: { data: { path: ['product_id'], equals: productId } },
  });
  const approved = reviews.filter((r) => r.data.status === 'approved');
  const reviewCount = approved.length;
  const averageRating = reviewCount
    ? Math.round((approved.reduce((sum, r) => sum + (r.data.rating || 0), 0) / reviewCount) * 10) / 10
    : 0;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;
  return prisma.product.update({
    where: { id: productId },
    data: { data: { ...product.data, averageRating, reviewCount } },
  });
}

// Replaces base44/functions/getConversionRates — requires your own Google
// Analytics 4 OAuth credentials. See MIGRATION.md for setup.
async function getConversionRates() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GA4_PROPERTY_ID } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GA4_PROPERTY_ID) {
    const err = new Error(
      'Google Analytics is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN and GA4_PROPERTY_ID (see MIGRATION.md).'
    );
    err.status = 501;
    throw err;
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    const err = new Error(`Google OAuth refresh failed: ${tokenData.error_description || tokenData.error}`);
    err.status = 502;
    throw err;
  }
  const accessToken = tokenData.access_token;
  const propertyId = GA4_PROPERTY_ID;

  const reportRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'itemName' }],
        metrics: [
          { name: 'itemsViewed' },
          { name: 'itemsPurchased' },
          { name: 'itemRevenue' },
          { name: 'addToCarts' },
          { name: 'checkouts' },
        ],
        orderBys: [{ metric: { metricName: 'itemsPurchased' }, desc: true }],
        limit: 20,
      }),
    }
  );
  const reportData = await reportRes.json();
  if (reportData.error) {
    const err = new Error(reportData.error.message || 'GA4 API error');
    err.status = 400;
    throw err;
  }

  const overallRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'transactions' },
          { name: 'purchaseRevenue' },
          { name: 'sessionKeyEventRate' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
        limit: 30,
      }),
    }
  );
  const overallData = await overallRes.json();

  const rows = reportData.rows || [];
  const items = rows
    .map((row) => {
      const name = row.dimensionValues?.[0]?.value || 'Unknown';
      const viewed = parseFloat(row.metricValues?.[0]?.value || '0');
      const purchased = parseFloat(row.metricValues?.[1]?.value || '0');
      const revenue = parseFloat(row.metricValues?.[2]?.value || '0');
      const cartAdds = parseFloat(row.metricValues?.[3]?.value || '0');
      const checkouts = parseFloat(row.metricValues?.[4]?.value || '0');
      return {
        name,
        viewed: Math.round(viewed),
        purchased: Math.round(purchased),
        revenue: Math.round(revenue * 100) / 100,
        cartAdds: Math.round(cartAdds),
        checkouts: Math.round(checkouts),
        viewToCart: viewed > 0 ? Math.round((cartAdds / viewed) * 1000) / 10 : 0,
        cartToCheckout: cartAdds > 0 ? Math.round((checkouts / cartAdds) * 1000) / 10 : 0,
        checkoutToPurchase: checkouts > 0 ? Math.round((purchased / checkouts) * 1000) / 10 : 0,
        viewToPurchase: viewed > 0 ? Math.round((purchased / viewed) * 1000) / 10 : 0,
      };
    })
    .filter((i) => i.purchased > 0 || i.viewed > 5);

  const dailyRows = overallData.rows || [];
  const daily = dailyRows.map((row) => {
    const date = row.dimensionValues?.[0]?.value || '';
    const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
    const transactions = parseFloat(row.metricValues?.[1]?.value || '0');
    const revenue = parseFloat(row.metricValues?.[2]?.value || '0');
    return {
      date: `${date.slice(4, 6)}/${date.slice(6, 8)}`,
      sessions: Math.round(sessions),
      transactions: Math.round(transactions),
      revenue: Math.round(revenue * 100) / 100,
      convRate: sessions > 0 ? Math.round((transactions / sessions) * 10000) / 100 : 0,
    };
  });

  return { propertyId, propertyName: propertyId, items, daily };
}

// Replaces base44/functions/getSlackChannels — requires your own Slack bot token.
async function getSlackChannels() {
  const { SLACK_BOT_TOKEN } = process.env;
  if (!SLACK_BOT_TOKEN) {
    const err = new Error('Slack is not configured. Set SLACK_BOT_TOKEN (see MIGRATION.md).');
    err.status = 501;
    throw err;
  }
  let allChannels = [];
  let cursor = '';
  do {
    const url = `https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } });
    const data = await res.json();
    if (!data.ok) return { error: data.error, channels: [] };
    allChannels = allChannels.concat(data.channels || []);
    cursor = data.response_metadata?.next_cursor || '';
  } while (cursor);
  return { channels: allChannels.map((c) => ({ id: c.id, name: c.name })) };
}

module.exports = {
  recalcPopularity,
  recalcTrending,
  notifyNewProduct,
  recomputeProductRating,
  getConversionRates,
  getSlackChannels,
};
