// Environment validation (spec §19.4) — parsed and validated ONCE at server startup.
//
// SERVER-ONLY. This module reads secrets (RAZORPAY_KEY_SECRET, MAGIC_LINK_SECRET, …).
// Never import it from a Client Component. Client code reads NEXT_PUBLIC_* directly
// off process.env — those are the only vars Next inlines into the browser bundle.
import { z } from "zod";

// Env booleans arrive as the strings "true" / "false"; coerce to real booleans.
const boolFrom = (fallback: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(fallback)
    .transform((v) => v === "true");

const schema = z.object({
  // Postgres — Prisma reads DATABASE_URL. The frozen data layer depends on it.
  DATABASE_URL: z.string().url(),

  // Razorpay, dedicated publications MID (§9). key_id is public (Checkout);
  // key_secret and the webhook secret NEVER leave the server.
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  // Resend transactional email (§11). From orders@learncrew.org, reply-to support@.
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().default("orders@learncrew.org"),
  EMAIL_REPLY_TO: z.string().default("support@learncrew.org"),
  // Inbox that also receives cancellation-requested notices (§11 tpl 5). Defaults to support@.
  ADMIN_EMAIL: z.string().default("support@learncrew.org"),

  // Google Sheet sync — Apps Script web app (§10). SHEETS_SECRET is the shared token.
  SHEETS_WEBHOOK_URL: z.string().url(),
  SHEETS_SECRET: z.string().min(1),

  // App + auth (§8). APP_URL backs magic links + metadataBase; MAGIC_LINK_SECRET
  // signs the login-token hashes. Guest checkout is default; flip the flag to force login.
  APP_URL: z.string().url(),
  MAGIC_LINK_SECRET: z.string().min(16),
  REQUIRE_LOGIN_AT_CHECKOUT: boolFrom("false"),

  // Money (§4) + invoicing (§12).
  GST_ENABLED: boolFrom("false"),
  GATEWAY_FEE_RATE: z.coerce.number().positive().default(0.0236),
});

function load(): z.infer<typeof schema> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = load();
export type Env = typeof env;
