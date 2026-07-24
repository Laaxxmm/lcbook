import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

// Payment-result page (§15). The callback only redirects the UI here — the authoritative order
// state comes from the Razorpay webhook (§9), so on success we say the confirmation email is on
// its way rather than asserting a final state the client can't know.
export const metadata: Metadata = { title: "Payment", robots: { index: false } };

type Status = "success" | "failed" | "cancelled";

const COPY: Record<Status, { heading: string; body: string }> = {
  success: {
    heading: "Payment received",
    body: "Thank you. We're confirming your order now — your confirmation email with the Bill of Supply will arrive shortly. You can track your order any time below.",
  },
  failed: {
    heading: "Payment didn't complete",
    body: "Your payment couldn't be verified or didn't go through. No charge is confirmed. You can try placing the order again.",
  },
  cancelled: {
    heading: "Checkout closed",
    body: "You closed the payment window, so this order isn't paid yet. You can pick up where you left off from the catalogue.",
  },
};

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const status: Status = sp.status === "success" || sp.status === "cancelled" ? sp.status : "failed";
  const order = typeof sp.order === "string" ? sp.order : undefined;
  const copy = COPY[status];

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-lc-green-800">{copy.heading}</h1>
        {order && <p className="mt-2 text-[13px] font-semibold text-lc-green-400">Order {order}</p>}
        <p className="mt-4 text-[15px] leading-relaxed text-lc-green-400">{copy.body}</p>

        <div className="mt-8 flex flex-col items-center gap-3">
          {status === "success" && order ? (
            <Button asChild>
              <Link href={`/track?order=${encodeURIComponent(order)}`}>Track my order</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/">Back to catalogue</Link>
            </Button>
          )}
          {status !== "success" && (
            <Link href="/track" className="text-sm font-semibold text-lc-green-700 underline underline-offset-4">
              Already ordered? Track it
            </Link>
          )}
        </div>
      </div>
    </Container>
  );
}
