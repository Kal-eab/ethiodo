// Test products let an admin exercise a feature end-to-end — order it, pay it,
// review it — without the data reaching the storefront or the dashboard.
//
// The server is what enforces this (see server/src/entityConfig.js and
// routes/entities.js): test products are stripped from every non-admin read,
// 404 on a direct link, and can't be ordered or carted by a customer. An order
// containing one is flagged `is_test_order` server-side, and a review left on
// such an order is flagged `is_test_review` and never counts toward a rating.
//
// These helpers are for the admin UI only — badging test data and keeping it
// out of the metrics the dashboard computes client-side.
export const isTestProduct = (product) => product?.is_test_product === true;
export const isTestOrder = (order) => order?.is_test_order === true;
export const isTestReview = (review) => review?.is_test_review === true;

export const realOrders = (orders = []) => orders.filter((o) => !isTestOrder(o));
export const testOrders = (orders = []) => orders.filter(isTestOrder);

// Shared look for the 🧪 TEST chip across the admin views.
export const TEST_BADGE_CLASS =
  'inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] uppercase border border-orange-400/40 bg-orange-400/10 text-orange-400';
