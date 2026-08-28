import { OrderStatus } from "@prisma/client";

// Explicit allowed-transitions map (spec §6). Anything absent is rejected.
// Cancellation windows: IN_STOCK locked at SHIPPED (cancellable until AWB entered);
// POD locked at PRINT_STARTED (cancellable until printing begins).
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING],
  [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED],
  [OrderStatus.PAYMENT_FAILED]: [], // terminal, stock released
  [OrderStatus.PAID]: [
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED_BY_USER,
    OrderStatus.CANCELLED_BY_ADMIN,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PICKING, // IN_STOCK branch
    OrderStatus.PRINT_QUEUED, // POD branch
    OrderStatus.CANCELLED_BY_USER,
    OrderStatus.CANCELLED_BY_ADMIN,
  ],
  // IN_STOCK branch
  [OrderStatus.PICKING]: [
    OrderStatus.PACKED,
    OrderStatus.CANCELLED_BY_USER,
    OrderStatus.CANCELLED_BY_ADMIN,
  ],
  [OrderStatus.PACKED]: [
    OrderStatus.SHIPPED, // AWB entered here → cancellation window closes
    OrderStatus.CANCELLED_BY_USER,
    OrderStatus.CANCELLED_BY_ADMIN,
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RTO],
  [OrderStatus.DELIVERED]: [OrderStatus.DAMAGE_REPLACEMENT, OrderStatus.RTO],
  // POD branch
  [OrderStatus.PRINT_QUEUED]: [
    OrderStatus.PRINT_STARTED, // printing begins → cancellation window closes
    OrderStatus.CANCELLED_BY_USER,
    OrderStatus.CANCELLED_BY_ADMIN,
  ],
  [OrderStatus.PRINT_STARTED]: [OrderStatus.PRINT_DONE], // locked, no cancel
  [OrderStatus.PRINT_DONE]: [OrderStatus.PACKED],
  // cancellation / refund
  [OrderStatus.CANCELLED_BY_USER]: [OrderStatus.REFUND_INITIATED],
  [OrderStatus.CANCELLED_BY_ADMIN]: [OrderStatus.REFUND_INITIATED],
  [OrderStatus.REFUND_INITIATED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
  // post-delivery
  [OrderStatus.RTO]: [],
  [OrderStatus.DAMAGE_REPLACEMENT]: [],
};

export function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// Cancellation window (§6), derived from the SAME map so there's one source of truth: an order is
// cancellable exactly while CANCELLED_BY_USER is a legal transition from its status — i.e. IN_STOCK
// until SHIPPED (AWB entered), POD until PRINT_STARTED (printing begins).
export function isCancellable(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].includes(OrderStatus.CANCELLED_BY_USER);
}

export const CANCELLABLE_STATUSES = (Object.keys(ALLOWED_TRANSITIONS) as OrderStatus[]).filter(
  isCancellable,
);

export class InvalidTransitionError extends Error {
  constructor(
    public readonly orderId: string,
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Illegal order transition ${from} → ${to} for ${orderId}`);
    this.name = "InvalidTransitionError";
  }
}

// Statuses in which payment has been collected — whether confirmed by the Razorpay webhook or
// advanced manually by an admin. Excludes pending/failed/cancelled/refunded. Used by the
// dashboard revenue KPIs and by the purchase-conversion gate on /pay.
export const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
  OrderStatus.PICKING,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.PRINT_QUEUED,
  OrderStatus.PRINT_STARTED,
  OrderStatus.PRINT_DONE,
  OrderStatus.RTO,
  OrderStatus.DAMAGE_REPLACEMENT,
];

export function isPaid(status: OrderStatus): boolean {
  return PAID_STATUSES.includes(status);
}
