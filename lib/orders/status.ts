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
