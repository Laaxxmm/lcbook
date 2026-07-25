# Learn Crew Publications — Phase 1

Book-selling storefront for Learn Crew (Indian entrance-exam coaching), replacing the WordPress
site at `publications.learncrew.org`. Sells the 5 physical book **sets** only; ebooks and recorded
courses are display-and-redirect to WiseApp (`elearning.learncrew.org`) — never sold here.

Stack: Next.js (App Router) + TypeScript · Prisma · PostgreSQL · Tailwind + shadcn/ui · Razorpay
(Orders API + Standard Checkout) · Resend · `@react-pdf/renderer` · Google Apps Script sheet sync.

---

## 1. Local development

**Prerequisites:** Node 20 LTS (see [§7 Node version](#7-node-version)) and PostgreSQL 14+.

```bash
# 1. Postgres — dev + test databases (matches .env defaults)
createdb lc_publications
createdb lc_publications_test
# or: psql -c "CREATE DATABASE lc_publications;" -c "CREATE DATABASE lc_publications_test;"

# 2. Env — copy the template and fill in secrets. EVERY var is documented in .env.example
#    and validated at startup by lib/env.ts (zod). The app will not boot with a bad env.
cp .env.example .env

# 3. Dependencies (postinstall runs `prisma generate`)
npm install

# 4. Apply migrations + seed the 5 SKUs (seeded at stock 0 — set stock in the admin panel)
npm run db:migrate      # prisma migrate dev
npm run db:seed         # 5 SKUs: PGCET_MBA/MCA, MAT, CAT, CLAT (paise prices + weights)

# 5. Run
npm run dev             # http://localhost:3000
```

**Tests** run against **real Postgres** (`TEST_DATABASE_URL`), not SQLite — the §13 acceptance
tests exercise real row locks and concurrent transactions. The test DB needs the migrations
applied once (`DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy`); the suite truncates
between tests.

```bash
npm run test            # vitest — the 12 §13 acceptance-test files
npm run typecheck       # tsc --noEmit
npm run build           # next build
```

Admin panel is at `/admin` (magic-link auth, single admin, no roles). Sign in with the
`ADMIN_EMAIL` address.

---

## 2. Railway deploy

1. **Create a Railway project** with a PostgreSQL plugin. Railway injects `DATABASE_URL`.
2. **Set env vars** (Railway → Variables). Everything in `.env.example` except `TEST_DATABASE_URL`
   and `PRISMA_LOG`. In particular: `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_EMAIL`,
   `SHEETS_WEBHOOK_URL`, `SHEETS_SECRET`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `MAGIC_LINK_SECRET`
   (a long random string), `GATEWAY_FEE_RATE`, `GST_ENABLED`, `REQUIRE_LOGIN_AT_CHECKOUT`.
   `APP_URL` and `NEXT_PUBLIC_APP_URL` = `https://publications.learncrew.org`.
3. **Migrations run automatically** on each release via `railway.toml`:
   ```toml
   [deploy]
   preDeployCommand = "npx prisma migrate deploy"
   ```
   `migrate deploy` is **additive only** — it applies pending migrations and never resets. Do
   **not** run `prisma migrate reset`/`db:reset` against production; those are destructive.
4. **Build/start** come from `package.json`: `build` → `next build`, `start` → `next start`,
   `postinstall` → `prisma generate`.

**Settlement float (§17):** keep **~₹20–25k** in the publications Razorpay account for the first
month. Razorpay debits refunds from the settlement balance, and a fresh MID starts near zero — a
refund on a low balance will fail.

---

## 3. Razorpay setup

Use a **dedicated MID for publications**, separate from the coaching account. `key_secret` is
server-only (never `NEXT_PUBLIC_`); only `NEXT_PUBLIC_RAZORPAY_KEY_ID` reaches the browser.

**Webhook** (Razorpay dashboard → Settings → Webhooks):

- **URL:** `https://publications.learncrew.org/api/webhooks/razorpay`
- **Secret:** generate one, put it in `RAZORPAY_WEBHOOK_SECRET`. The handler verifies
  `X-Razorpay-Signature` and rejects mismatches.
- **Subscribe to exactly:** `payment.captured`, `payment.failed`, `refund.processed`,
  `refund.failed`.
- **Idempotency:** the handler inserts each Razorpay event id into `WebhookEvent` under a unique
  constraint — duplicate retries return 200 and no-op.
- **Source filter:** every order is created with `notes: { source: "publications" }`. The handler
  **ignores any event whose `notes.source !== "publications"`** (returns 200, does nothing). This
  guards against a shared/misconfigured account even on a dedicated MID.
- **Amount reconciliation:** a webhook amount that doesn't match the stored order amount is
  **flagged for admin, not auto-confirmed** (see `/admin/flagged`).

**Test mode → live (§17):** develop and test against test keys. Razorpay reviews the **live URL**
(pricing, terms, refund/shipping policy, contact) before approving the live MID — those pages must
be publicly reachable first (see [§8 sequencing](#8-deploy-sequencing)). Once approved, swap
`NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to the live keys and re-create the webhook
with a fresh live `RAZORPAY_WEBHOOK_SECRET`.

**Refunds:** `refundAmount = amountPaise − ceil(amountPaise × GATEWAY_FEE_RATE)` (default 2.36% =
2% Razorpay + 18% GST on the fee). The retained fee is stored on the order. A customer cancel is a
**request** — the admin approves it in the cancellation inbox, which triggers the refund;
`REFUND_INITIATED → REFUNDED` only on the `refund.processed` webhook. Double-refunds are refused
inside the locked transaction.

---

## 4. Resend (transactional email)

- **From:** `orders@learncrew.org`, sent via the subdomain **`txn.learncrew.org`**.
- **Reply-To:** `support@learncrew.org`.

Add the domain **`txn.learncrew.org`** in the Resend dashboard (Domains → Add Domain). Resend then
shows the exact DNS records to add — copy the **DKIM public key and MAIL-FROM region from your own
dashboard**; the values below are the record *shapes*, hosted on Hostinger.

### 5. Hostinger DNS records

Add these at Hostinger (hPanel → DNS Zone for `learncrew.org`). Hostinger's "Name" is the host
**relative to `learncrew.org`** (it appends the root automatically).

| Type | Name (host) | Value | Notes |
|------|-------------|-------|-------|
| `MX`  | `send.txn` | `feedback-smtp.<region>.amazonses.com` (priority `10`) | return-path / bounces; `<region>` from Resend |
| `TXT` | `send.txn` | `v=spf1 include:amazonses.com ~all` | **SPF for the sending subdomain** |
| `TXT` | `resend._domainkey.txn` | `p=<LONG_DKIM_PUBLIC_KEY_FROM_RESEND>` | DKIM — paste exactly from Resend |
| `TXT` | `_dmarc.txn` | `v=DMARC1; p=none; rua=mailto:dmarc@learncrew.org` | DMARC for the sender; tighten to `p=quarantine` later |

> ### ⚠️ SINGLE-SPF WARNING — only ONE SPF (`v=spf1…`) TXT record may exist per hostname.
> The sender's SPF above lives on **`send.txn.learncrew.org`**, so it does not collide with the
> root `learncrew.org` SPF. **But** `support@learncrew.org` is on **Microsoft 365 (Outlook)**, so the
> **root `learncrew.org` already has an SPF record** (`v=spf1 include:spf.protection.outlook.com -all`).
> Never add a second SPF TXT anywhere that already has one — **two SPF records on the same host makes
> both fail and all mail from it goes unauthenticated.** If you ever move sending to the root instead
> of the `txn` subdomain, you must **merge** the includes into the one existing record, e.g.
> `v=spf1 include:spf.protection.outlook.com include:amazonses.com -all` — not add a second line.

After the records propagate, click **Verify** in Resend. Send a test from the app (any order
confirmation) and confirm SPF + DKIM = pass in the received headers.

---

## 6. Google Sheet sync (Apps Script)

The Apps Script web app is already written. It upserts rows by `order_id` (partial updates) into
three tabs: **Orders**, **Cancellations**, **PrintQueue**. The sheet is a **read-only mirror** —
Postgres is the source of truth; the app never reads order state back from it.

1. Create the Google Sheet with tabs `Orders`, `Cancellations`, `PrintQueue`.
2. Extensions → Apps Script → paste the sync script → **Deploy → New deployment → Web app**,
   "Execute as me", "Who has access: Anyone".
3. Copy the deployment `/exec` URL into `SHEETS_WEBHOOK_URL`, and set the same shared secret in the
   script and in `SHEETS_SECRET`. The app posts `{ secret, sheet, data: { order_id, … } }`.

Sync is **non-blocking and retried** — if Apps Script is down the order still completes. Jobs queue
to `SheetSyncJob` with exponential backoff; failures surface at `/admin/sheet-sync` with a manual
retry.

---

## 7. Editing the ebook / course catalogue — `config/elearning.ts`

Digital products are **display-and-redirect only**. The outbound URLs live in `config/elearning.ts`
as two **nullable** maps keyed by SKU:

```ts
export const EBOOK_URL:  Partial<Record<SkuCode, string>> = { PGCET_MBA: "...", CAT: "...", ... };
export const COURSE_URL: Partial<Record<SkuCode, string>> = { PGCET_MBA: "...", MAT: "...", ... };
```

- **A missing URL hides that row** (product page **and** email upsell). Never render a dead link or
  a price with no destination. If **both** are missing for a SKU, the whole upsell panel is hidden.
- When WiseApp publishes a new destination, add the URL here — that's the only change needed.
- Two known catalogue defects are handled deliberately (do not "fix" in code): PGCET MBA/MCA point
  at the **same** WiseApp product, so a **single** PGCET ebook price is shown; that product is named
  "PGCET Mocks", labelled accordingly rather than as a plain eBook.
- Ebooks and recorded courses are **non-refundable** — stated before the outbound click and in the
  confirmation email.

### Node version

Railway targets **Node 20 LTS** (pinned in `package.json` → `engines.node`). Local development for
this build used **Node 25** — fine locally, but keep prod on 20 for a Railway-supported LTS.

---

## 8. Deploy sequencing (§17)

The publications Razorpay MID needs approval, and **Razorpay reviews the live URL** (pricing,
terms, privacy, refund policy, contact) — that review is on the critical path.

1. Ship the **catalogue + the four policy pages** (`/terms`, `/refund-policy`, `/shipping-policy`,
   `/contact`) to `publications.learncrew.org` first. No working checkout required.
2. **Submit that URL** for the MID immediately.
3. Build/verify **checkout, state machine, refunds** while KYC runs.
4. Stay in **test mode** until approved, then swap to live keys (§3).

**Cutover:** crawl the WordPress sitemap, build a 301 map old→new, run both in parallel for two
weeks before retiring WordPress.

---

## Cancellation model (§6) — how it actually works

A customer cancellation is a **request for admin review, never an auto-refund**:

- **Customer** (on `/track`, within the window) files a request → sets `cancelRequestedAt` /
  `cancelReason`, **no status change, no refund**. Outside the window (IN_STOCK after `SHIPPED`, POD
  after `PRINT_STARTED`) the request is refused with a plain message.
- **Admin — approve** (cancellation inbox) → transitions to `CANCELLED_BY_USER` **and** initiates
  the guarded refund. Fails cleanly if the order shipped in the meantime (no refund on a shipped
  order).
- **Admin — reject** → marks the request reviewed and notifies the customer; the order **stays in
  fulfilment**.

The request/approve/reject logic lives in `lib/orders/cancellation.ts` (row-locked, writes
append-only `OrderEvent`s) and is shared by the store API (`/api/cancel`) and the admin panel.
