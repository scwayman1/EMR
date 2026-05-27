# Payabli Onboarding & Wire-Up Runbook

> Authority: EMR-232. Owner: Scott. The dashboard steps below are
> human-only — you must do them before the smoke test will round-trip
> against a real account.

## 1. Sandbox account

1. Sign up at [payabli.com](https://payabli.com) using a `scott@leafjourney.[tbd]` address. Choose **Sandbox** environment.
2. Note the **org id** assigned to your account — Payabli scopes Pay Points under it.

## 2. Create the hemp Pay Point

1. Dashboard → **Pay Points** → **+ New**.
2. Name: `leafjourney-hemp-sandbox`.
3. Card networks enabled (hemp products are not licensed-cannabis under the 2018 Farm Bill — Visa/MC accept these merchants).
4. Webhook URL: `https://<your-deploy>/api/webhooks/payabli/marketplace` (use ngrok or vercel preview during dev).
5. Webhook secret: generate a long random value and paste into both the dashboard *and* into your `.env` as `PAYABLI_WEBHOOK_SECRET`. **Never commit this.**
6. Copy the Pay Point id; this becomes `PAYABLI_ENTRY_POINT`.

## 3. API key

1. Dashboard → **API** → **+ New API Key**. Read + write scopes for MoneyIn / Query.
2. Paste into `.env` as `PAYABLI_API_KEY`. **Never commit this.**

## 4. Required env vars

```bash
PAYMENT_GATEWAY=payabli
PAYABLI_API_KEY=<from step 3>
PAYABLI_ENTRY_POINT=<Pay Point id from step 2>
PAYABLI_WEBHOOK_SECRET=<long random from step 2>
PAYABLI_API_BASE_URL=https://api-sandbox.payabli.com   # production: https://api.payabli.com
```

## 5. Code surface

- API client: [`src/lib/leafmart/payabli/client.ts`](../../src/lib/leafmart/payabli/client.ts)
  - `getsale` — authorize + capture
  - `getauth` / `capture` — split flow for review-required orders
  - `refund` — partial or full
  - `getTransaction` — read-only state lookup
  - Auth: `requestToken` header. Retry on 5xx + 429 with exponential backoff. Idempotency-Key bound to body field on POSTs.
- Webhook verifier: [`src/lib/leafmart/payabli/webhook.ts`](../../src/lib/leafmart/payabli/webhook.ts)
  - `verifyWebhookSignature` — HMAC-SHA256 with `timingSafeEqual`. Accepts `sha256=<hex>` or `<hex>` header values.
  - `registerHandler(eventType, fn)` / `dispatchWebhookEvent(event)` — handler registry. Register handlers at server start.
- Marketplace webhook route: [`src/app/api/webhooks/payabli/marketplace/route.ts`](../../src/app/api/webhooks/payabli/marketplace/route.ts).
- Clinical-billing webhook route is sibling at [`/api/webhooks/payabli/route.ts`](../../src/app/api/webhooks/payabli/route.ts) — different Pay Point, different concern, do not merge.

## 6. Smoke test (after sandbox is set up)

```ts
import { PayabliClient } from "@/lib/leafmart/payabli/client";

const client = new PayabliClient();
const result = await client.getsale({
  entryPoint: process.env.PAYABLI_ENTRY_POINT!,
  idempotencyKey: `smoke-${Date.now()}`,
  paymentDetails: { totalAmount: 1.0 },
  paymentMethod: {
    method: "card",
    cardnumber: "4111111111111111",
    cardexp: "12/30",
    cardcvv: "123",
    cardholder: "Test User",
  },
  customer: { customerNumber: "smoke-test", email: "scott@leafjourney.[tbd]" },
});
console.log("transaction id:", result.referenceId);
```

Expect:
1. `result.responseCode === 0` and `result.referenceId` returned.
2. Within ~5s the dashboard shows the transaction.
3. Within ~10s the webhook fires `TransactionCaptured` to your route. The route logs the dispatch.

End-to-end target: **< 30 seconds** per EMR-232 acceptance.

## 7. Acceptance status

- ⛔ **Sandbox signup** — human, Scott. Required before smoke test runs.
- ⛔ **Pay Point creation** — human, Scott.
- ⛔ **Test $1.00 charge** — depends on signup + Pay Point.
- ✅ **API client wrapper** with auth, retry, idempotency.
- ✅ **Webhook endpoint** with HMAC verification, event dispatcher.
- ✅ **Secret keys never logged** — verified in tests (`client.test.ts`).
- ⏳ **CI integration smoke test** — module is mocked in `client.test.ts`. A network-touching smoke test against the sandbox can be added once secrets are stored in CI env (do not commit them).

## 8. Production cutover

When moving to production:

1. Switch `PAYABLI_API_BASE_URL` to `https://api.payabli.com`.
2. Provision a new **production** Pay Point in Payabli's prod dashboard.
3. Generate a fresh `PAYABLI_WEBHOOK_SECRET` (don't reuse the sandbox one).
4. Run reconciliation for 7 days (per the launch runbook §1) before flipping marketing CTAs live.
