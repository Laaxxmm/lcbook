import { handleRazorpayWebhook } from "@/lib/webhook";

// Thin wrapper (§9). Read the RAW body + signature + event-id headers, hand them to the
// frozen handler, return its status fast. All side-effects (PDF, email, sheet sync) are
// enqueued as background jobs inside the handler/state machine, so 200 comes back quickly.
// Raw body is mandatory — signature is an HMAC over the exact bytes; never JSON.parse first.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const eventId = req.headers.get("x-razorpay-event-id") ?? "";
  const result = await handleRazorpayWebhook(rawBody, signature, eventId);
  return new Response(result.note, { status: result.status });
}
