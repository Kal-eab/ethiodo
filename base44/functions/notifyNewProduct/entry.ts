import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Called by entity automation when a product is published (draft → published)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const productId = body?.event?.entity_id || body?.data?.id;
    if (!productId) return Response.json({ error: 'No product id' }, { status: 400 });

    const sr = base44.asServiceRole;

    // Use data from payload directly if available (faster), otherwise fetch
    let product = body?.data;
    if (!product || !product.name) {
      const products = await sr.entities.Product.filter({ id: productId });
      product = products[0];
    }
    if (!product || !product.published) {
      return Response.json({ skipped: true, reason: 'not published' });
    }

    // Fetch all users
    const users = await sr.entities.User.list();
    if (!users || users.length === 0) return Response.json({ notified: 0 });

    // Bulk create notifications for all users
    const notifications = users.map(u => ({
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
    }));

    await sr.entities.UserNotification.bulkCreate(notifications);

    return Response.json({ notified: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});