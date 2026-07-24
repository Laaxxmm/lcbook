import type { Order } from "@prisma/client";
import { OrderStatus } from "@prisma/client";
import { ALLOWED_TRANSITIONS } from "@/lib/orders/status";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, inputCls } from "@/components/admin/action-form";
import { statusLabel } from "@/components/admin/status-badge";
import { advanceOrder, dispatchOrder, refundOrder } from "@/app/admin/(panel)/actions";

// Legal-transitions control (§14): render ONLY the transitions ALLOWED_TRANSITIONS permits from
// the current status as live actions; grey out every other reachable status as a disabled chip.
// Every action routes through the frozen, row-locked state machine / refund lib.
//
// Three transitions need more than a one-click button:
//   SHIPPED           → AWB + courier form (dispatch; §6 locks cancellation here)
//   REFUND_INITIATED  → guarded refund action (double-refund-guarded in lib/refunds)
//   (everything else) → advanceOrder(toStatus)

// All statuses that are ever a transition target — the universe we grey the unavailable ones from.
const ALL_TARGETS = Array.from(new Set(Object.values(ALLOWED_TRANSITIONS).flat())) as OrderStatus[];

export function TransitionControls({ order }: { order: Order }) {
  const allowed = ALLOWED_TRANSITIONS[order.status];
  const rest = ALL_TARGETS.filter((s) => !allowed.includes(s) && s !== order.status);

  return (
    <div>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Legal transitions</h2>

      {allowed.length === 0 ? (
        <p className="mt-2 text-[14px] text-lc-green-400">No further transitions — this is a terminal status.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {allowed.map((to) => {
            if (to === OrderStatus.SHIPPED) {
              return (
                <ActionForm
                  key={to}
                  action={dispatchOrder}
                  submitLabel="Dispatch → Shipped"
                  confirm="Dispatch this order? Cancellation locks at SHIPPED."
                  className="w-full max-w-sm rounded-[12px] border border-lc-border bg-[rgba(14,59,46,0.03)] p-3"
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <div className="text-[13px] font-semibold text-lc-green-800">Dispatch (AWB + courier)</div>
                  <div className="mt-2 grid gap-2">
                    <input name="courier" placeholder="Courier (e.g. DTDC, Delhivery)" className={inputCls} required />
                    <input name="awb" placeholder="AWB / tracking number" className={inputCls} required />
                  </div>
                </ActionForm>
              );
            }
            if (to === OrderStatus.REFUND_INITIATED) {
              return (
                <ActionButton
                  key={to}
                  action={refundOrder}
                  hidden={{ orderId: order.id }}
                  variant="secondary"
                  size="sm"
                  confirm="Initiate a refund? This calls Razorpay (minus gateway fee) and can't be undone."
                >
                  Initiate refund
                </ActionButton>
              );
            }
            return (
              <ActionButton
                key={to}
                action={advanceOrder}
                hidden={{ orderId: order.id, toStatus: to }}
                variant="outline"
                size="sm"
              >
                → {statusLabel(to)}
              </ActionButton>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <>
          <div className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-lc-green-400/70">
            Not legal from {statusLabel(order.status)}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rest.map((s) => (
              <span
                key={s}
                title={`Not a legal transition from ${statusLabel(order.status)}`}
                className="cursor-not-allowed rounded-full border border-lc-border bg-neutral-50 px-2.5 py-1 text-[12px] font-medium text-neutral-400"
              >
                {statusLabel(s)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
