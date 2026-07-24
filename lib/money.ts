// Money handling (spec §4, non-negotiable).
// Store all money as INTEGER PAISE. Never float. Round retained gateway fee UP.

// Gateway fee retained on refund: 2% Razorpay + 18% GST on the fee = 2.36% default.
export const GATEWAY_FEE_RATE = Number(process.env.GATEWAY_FEE_RATE ?? "0.0236");

// GST fields are built but dormant until this is true (§12).
export const GST_ENABLED = (process.env.GST_ENABLED ?? "false") === "true";

export interface RefundBreakdown {
  refundAmountPaise: number;
  gatewayFeeRetainedPaise: number;
}

/**
 * refundAmount = amountPaise − ceil(amountPaise × rate).
 * Computed in integer parts-per-million to avoid float drift (§4).
 */
export function computeRefund(amountPaise: number, rate = GATEWAY_FEE_RATE): RefundBreakdown {
  if (!Number.isInteger(amountPaise) || amountPaise < 0) {
    throw new Error(`amountPaise must be a non-negative integer, got ${amountPaise}`);
  }
  const ratePpm = Math.round(rate * 1_000_000);
  const gatewayFeeRetainedPaise = Math.ceil((amountPaise * ratePpm) / 1_000_000);
  return { gatewayFeeRetainedPaise, refundAmountPaise: amountPaise - gatewayFeeRetainedPaise };
}

/** Display helper — paise → "₹1,600.00". */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
