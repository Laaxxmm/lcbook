import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyMagicLink } from "@/lib/auth";
import { Container } from "@/components/ui/container";
import { OrderDetail } from "@/components/store/order-detail";
import { TrackLookup } from "@/components/store/track-lookup";
import { SESSION_COOKIE, signOrderToken, verifyOrderToken, verifySession } from "@/app/_lib/tokens";

// Order tracking (§8). SECURITY: a bare order id NEVER reveals an order. Identity must come from
// one of three proofs, verified server-side before anything is shown:
//   1. ?token=<durable>  — signed order-id token (has a dot). From order-id+phone lookup and the
//                          durable email link. Verified via HMAC + 30-day TTL.
//   2. ?token=<magic>    — single-use magic-link login token (no dot). Shows that user's orders.
//   3. lc_session cookie — set after OTP / magic-link login.
// Otherwise: the order-id + phone lookup form (?order= only pre-fills the id, proves nothing).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

async function ordersForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];
  return prisma.order.findMany({
    where: { customerEmail: user.email },
    orderBy: { createdAt: "desc" },
  });
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; order?: string }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : undefined;
  const orderParam = typeof sp.order === "string" ? sp.order : undefined;

  // 1. Durable order token (contains a dot) — reveals exactly one order.
  if (token && token.includes(".")) {
    const id = verifyOrderToken(token);
    const order = id ? await prisma.order.findUnique({ where: { id } }) : null;
    return (
      <Shell>
        {order ? <OrderDetail order={order} cancelToken={token} /> : <Invalid />}
      </Shell>
    );
  }

  // 2. Magic-link login token (single-use, no dot) — reveals that user's orders.
  if (token) {
    const uid = await verifyMagicLink(token);
    const orders = uid ? await ordersForUser(uid) : [];
    return <Shell>{uid ? <OrderList orders={orders} /> : <Invalid />}</Shell>;
  }

  // 3. Session cookie.
  const uid = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (uid) {
    const orders = await ordersForUser(uid);
    return <Shell>{<OrderList orders={orders} />}</Shell>;
  }

  // 4. Lookup form — order id (pre-filled) + phone.
  return (
    <Shell>
      <p className="mt-2 text-[15px] text-lc-green-400">
        Enter your order ID and the phone number on the order. Prefer one-click? Use the link in
        your confirmation email or <a href="/login" className="font-semibold text-lc-green-700 underline underline-offset-4">sign in</a>.
      </p>
      <TrackLookup defaultOrderId={orderParam} />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-lc-green-800">Track your order</h1>
        {children}
      </div>
    </Container>
  );
}

function Invalid() {
  return (
    <div className="mt-6 rounded-[12px] border border-lc-border bg-white p-4 text-[15px] text-lc-green-800">
      That tracking link is invalid or has expired. Use the order-id + phone lookup below, or request
      a fresh sign-in link.
      <div className="mt-4">
        <TrackLookup />
      </div>
    </div>
  );
}

function OrderList({ orders }: { orders: Awaited<ReturnType<typeof ordersForUser>> }) {
  if (orders.length === 0) {
    return <p className="mt-6 text-[15px] text-lc-green-400">You don&apos;t have any orders yet.</p>;
  }
  return (
    <div>
      {orders.map((o) => (
        // Mint a fresh durable token per order so each card can file its own cancellation request.
        <OrderDetail key={o.id} order={o} cancelToken={signOrderToken(o.id)} />
      ))}
    </div>
  );
}
