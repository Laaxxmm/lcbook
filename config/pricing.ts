// Estimated courier cost per kg, in integer paise.
//
// Catalogue prices INCLUDE shipping (§3) and the app never records the actual courier
// cost per order — that's an external expense. So the admin dashboard's "Shipping cost"
// is an ESTIMATE: order weight (from the frozen snapshot) × this rate. Set
// SHIPPING_RATE_PER_KG_PAISE to your negotiated courier rate to make it accurate.
// ponytail: single flat rate, not zone/weight-slab courier pricing — upgrade when finance needs it.
export const SHIPPING_RATE_PER_KG_PAISE = Math.max(
  0,
  Math.round(Number(process.env.SHIPPING_RATE_PER_KG_PAISE ?? 4000)),
);
