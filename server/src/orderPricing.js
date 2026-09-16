// Server-authoritative order pricing.
//
// The client sends each order item's `price` and the order `total`, but the
// client is the untrusted party — a crafted request could submit a manipulated
// price or total (see src/pages/Checkout.jsx / DirectPayment.jsx, which compute
// these in the browser). This recomputes both from the real Product records so
// the stored order always reflects true prices, regardless of what was sent.
//
// The unit-price formula mirrors src/lib/productOptions.js `unitPrice`:
//   unit = product.price + Σ price_add of the selected option values
// Legacy products (flat `sizes`, no `price_add`, item carries `size` not
// `options`) resolve to the base price — matching the frontend exactly.

// product: the Product row's `.data` blob. options: the item's selection object
// ({ "Color": "White", "Storage": "256GB" }) or null/undefined.
function serverUnitPrice(productData, options) {
  const base = Number(productData?.price) || 0;
  if (!options || typeof options !== 'object') return base;
  const groups = Array.isArray(productData?.option_groups) ? productData.option_groups : [];
  let add = 0;
  for (const g of groups) {
    const chosenLabel = options[g?.name];
    const value = (g?.values || []).find((v) => v?.label === chosenLabel);
    if (value?.price_add) add += Number(value.price_add) || 0;
  }
  return base + add;
}

// Returns a copy of the order `data` with every item's `price` and `quantity`
// normalised to server-trusted values and `total` recomputed. Items whose
// product no longer exists fall back to the client-sent snapshot price (rare —
// a product deleted between add-to-cart and checkout) so a legitimate order
// isn't lost; a mismatch is logged for visibility.
function repriceOrder(data, productsById) {
  const items = Array.isArray(data?.items) ? data.items : [];
  let total = 0;
  const pricedItems = items.map((item) => {
    const product = productsById[item?.product_id];
    const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));
    const unit = product ? serverUnitPrice(product.data, item?.options) : Number(item?.price) || 0;
    if (product && Number(item?.price) !== unit) {
      console.warn(
        `[orderPricing] item ${item.product_id}: client price ${item?.price} corrected to ${unit}`
      );
    }
    total += unit * quantity;
    return { ...item, price: unit, quantity };
  });
  if (Number(data?.total) !== total) {
    console.warn(`[orderPricing] order total ${data?.total} corrected to ${total}`);
  }
  return { ...data, items: pricedItems, total };
}

module.exports = { serverUnitPrice, repriceOrder };
