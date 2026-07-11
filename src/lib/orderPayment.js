// Single source of truth for the two-stage payment split, shared by the buyer's
// checkout (DirectPayment), the buyer's Orders page and the admin dashboard.
//
// Stage 1: the buyer transfers a 10% deposit to place the order.
// Stage 2: once the admin marks the order delivered, the remaining 90% is
//          requested — the buyer uploads proof, the admin confirms receipt.
//
// The stage lives on `order.final_payment_status`, orthogonal to `order.status`
// (pending → confirmed → shipped → delivered), so reviews and the existing
// status tabs keep working unchanged.
export const DEPOSIT_RATE = 0.1;

export const depositAmount = (total) => Math.round((total || 0) * DEPOSIT_RATE);
export const finalAmount = (total) => Math.round((total || 0) * (1 - DEPOSIT_RATE));

export const FINAL_PAYMENT = {
  // Admin marked the order delivered — the buyer owes the remaining 90%.
  AWAITING_PAYMENT: 'awaiting_payment',
  // Buyer uploaded proof — the admin has to confirm it.
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  // Admin confirmed the money landed — the order is fully paid.
  PAID: 'paid',
};

export const FINAL_PAYMENT_LABELS = {
  [FINAL_PAYMENT.AWAITING_PAYMENT]: 'Waiting for Rest of Money',
  [FINAL_PAYMENT.AWAITING_CONFIRMATION]: 'Awaiting Payment Confirmation',
  [FINAL_PAYMENT.PAID]: 'Completed',
};

// Orders the seller still has to chase or review — the "Awaiting Final Payment"
// queue on the admin dashboard.
export const isFinalPaymentOpen = (order) =>
  order?.final_payment_status === FINAL_PAYMENT.AWAITING_PAYMENT ||
  order?.final_payment_status === FINAL_PAYMENT.AWAITING_CONFIRMATION;

// The amount the buyer still owes. Falls back to 90% of the total for orders
// delivered before this field existed.
export const finalAmountDue = (order) =>
  order?.final_payment_amount != null ? order.final_payment_amount : finalAmount(order?.total);
