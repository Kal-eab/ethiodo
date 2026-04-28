import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');

    // 1. List GA4 properties to get the property ID
    const propsRes = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/-&pageSize=10',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const propsData = await propsRes.json();
    const properties = propsData.properties || [];

    if (properties.length === 0) {
      return Response.json({ error: 'No GA4 properties found. Make sure your Google Analytics account has at least one GA4 property.' }, { status: 404 });
    }

    // Use the first available property
    const propertyName = properties[0].name; // e.g. "properties/123456789"
    const propertyId = propertyName.replace('properties/', '');

    // 2. Fetch last 30 days: item-level ecommerce data
    const reportRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
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
      return Response.json({ error: reportData.error.message || 'GA4 API error' }, { status: 400 });
    }

    // 3. Fetch overall session + purchase conversion
    const overallRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
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

    // Parse items
    const rows = reportData.rows || [];
    const items = rows.map(row => {
      const name = row.dimensionValues?.[0]?.value || 'Unknown';
      const viewed = parseFloat(row.metricValues?.[0]?.value || '0');
      const purchased = parseFloat(row.metricValues?.[1]?.value || '0');
      const revenue = parseFloat(row.metricValues?.[2]?.value || '0');
      const cartAdds = parseFloat(row.metricValues?.[3]?.value || '0');
      const checkouts = parseFloat(row.metricValues?.[4]?.value || '0');
      const viewToCart = viewed > 0 ? (cartAdds / viewed) * 100 : 0;
      const cartToCheckout = cartAdds > 0 ? (checkouts / cartAdds) * 100 : 0;
      const checkoutToPurchase = checkouts > 0 ? (purchased / checkouts) * 100 : 0;
      const viewToPurchase = viewed > 0 ? (purchased / viewed) * 100 : 0;
      return {
        name,
        viewed: Math.round(viewed),
        purchased: Math.round(purchased),
        revenue: Math.round(revenue * 100) / 100,
        cartAdds: Math.round(cartAdds),
        checkouts: Math.round(checkouts),
        viewToCart: Math.round(viewToCart * 10) / 10,
        cartToCheckout: Math.round(cartToCheckout * 10) / 10,
        checkoutToPurchase: Math.round(checkoutToPurchase * 10) / 10,
        viewToPurchase: Math.round(viewToPurchase * 10) / 10,
      };
    }).filter(i => i.purchased > 0 || i.viewed > 5);

    // Parse daily overall
    const dailyRows = overallData.rows || [];
    const daily = dailyRows.map(row => {
      const date = row.dimensionValues?.[0]?.value || '';
      const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
      const transactions = parseFloat(row.metricValues?.[1]?.value || '0');
      const revenue = parseFloat(row.metricValues?.[2]?.value || '0');
      const convRate = sessions > 0 ? (transactions / sessions) * 100 : 0;
      return {
        date: `${date.slice(4, 6)}/${date.slice(6, 8)}`,
        sessions: Math.round(sessions),
        transactions: Math.round(transactions),
        revenue: Math.round(revenue * 100) / 100,
        convRate: Math.round(convRate * 100) / 100,
      };
    });

    return Response.json({
      propertyId,
      propertyName: properties[0].displayName || propertyId,
      items,
      daily,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});