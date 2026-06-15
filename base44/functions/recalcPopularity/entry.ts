import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Recalculates popularity score for all published products
// Score = Likes×3 + Shares×5 + Views×1 + Orders×10
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const [products, likes, shares] = await Promise.all([
      sr.entities.Product.list('-created_date', 200),
      sr.entities.ProductLike.list('-created_date', 500),
      sr.entities.ProductShare.list('-created_date', 500),
    ]);

    // Count likes and shares per product
    const likesMap = {};
    for (const l of likes) {
      likesMap[l.product_id] = (likesMap[l.product_id] || 0) + 1;
    }
    const sharesMap = {};
    for (const s of shares) {
      sharesMap[s.product_id] = (sharesMap[s.product_id] || 0) + 1;
    }

    let updated = 0;
    for (const p of products) {
      const l = likesMap[p.id] || 0;
      const s = sharesMap[p.id] || 0;
      const v = p.totalViews || 0;
      const o = p.totalPurchases || 0;
      const score = l * 3 + s * 5 + v * 1 + o * 10;

      await sr.entities.Product.update(p.id, {
        totalLikes: l,
        totalShares: s,
        popularityScore: score,
        lastScoreUpdatedAt: new Date().toISOString(),
      });
      updated++;
    }

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});