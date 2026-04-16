# Clerk Authentication — Setup Guide

Leafjourney supports two authentication backends:

- **`iron-session`** (default) — custom bcrypt + encrypted cookies. Fine for dev/demo.
- **`clerk`** — Clerk-managed auth. HIPAA-ready path (Business plan + BAA required for compliance).

Toggle between them with `AUTH_PROVIDER` env var. Everything else — Prisma User/Membership/Role/Organization models, RBAC guards, audit logging — stays identical.

---

## 1. Sign up for Clerk

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Create a new Application (name it "Leafjourney")
3. Choose your sign-in methods:
   - **Email + Password** (always enable)
   - **Google** (recommended — reduces password fatigue)
   - **Apple** (optional, nice for iOS users)
4. Leave MFA off for now — we'll enable it later for clinicians/operators

## 2. Copy API keys

From Clerk Dashboard → **API Keys**:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## 3. Set up the webhook (user sync)

Clerk pushes user.created/updated/deleted events to us so Prisma stays in sync.

1. In Clerk Dashboard → **Webhooks** → "Add Endpoint"
2. URL: `https://<your-domain>/api/webhooks/clerk`
   - For local dev, use [ngrok](https://ngrok.com) or [svix play](https://play.svix.com)
3. Subscribe to these events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the **Signing Secret** (starts with `whsec_`)

```bash
CLERK_WEBHOOK_SECRET=whsec_...
```

## 4. Set redirect URLs

These tell Clerk where to send users after sign-in / sign-up:

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/portal
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/portal
```

## 5. Flip the feature flag

```bash
AUTH_PROVIDER=clerk
```

Restart the dev server / redeploy. Clerk is now active.

## 6. Verify

- Visit `/sign-in` — should see Clerk's hosted sign-in UI
- Sign up as a test user
- Check Prisma Studio — a new `User` row should appear with `clerkId` populated
- Sign in → should redirect to `/portal`
- Click the Leafjourney logo → should go to your role's home, not the public landing page

---

## Architecture

```
┌─────────────┐      ┌───────────────┐      ┌──────────────┐
│   Clerk     │      │  Middleware   │      │  Prisma User │
│  (identity) │─────▶│  (route auth) │─────▶│  (RBAC +PHI) │
│             │      │               │      │              │
│ email, name │      │ public routes │      │ clerkId,     │
│ password    │      │ auth required │      │ Memberships, │
│ MFA, social │      │               │      │ roles, org   │
└─────────────┘      └───────────────┘      └──────────────┘
       │                                             ▲
       │         webhook: user.created               │
       └─────────────────────────────────────────────┘
             /api/webhooks/clerk (svix-signed)
```

**PHI stays firewalled:** Clerk only sees identity (email, name, auth factors). All clinical data lives in our Postgres. Even on the Free plan, we're not leaking anything we shouldn't.

---

## Upgrade path to HIPAA production

1. **When ready for real patients:** upgrade to Clerk's **Business plan** (~$25/mo base).
2. **Request BAA** from Clerk support — standard on Business plan.
3. **Sign BAAs** with all other PHI processors: Render (hosting), OpenRouter (AI), Payabli (payments).
4. **Set `HIPAA_MODE=true`** — enforces stricter session TTLs, required MFA for clinicians, IP logging.
5. **No code changes required** — it's a billing + config flip.

---

## Troubleshooting

### "Clerk not yet enabled" on /sign-in
You haven't set `AUTH_PROVIDER=clerk` yet. Legacy `/login` still works.

### 401 on /api/webhooks/clerk
Check that `CLERK_WEBHOOK_SECRET` matches the Signing Secret from Clerk's webhook settings.

### User exists in Clerk but not in Prisma
The webhook lag fallback in `clerk-session.ts` will auto-provision the user on first read. If that doesn't happen, check:
- Webhook endpoint is reachable (try Clerk's "Test" button)
- Webhook is subscribed to `user.created`

### Can't sign out
`logoutAction` clears both cookies. If stuck, manually clear:
- `__session` (Clerk)
- `emr_session` (iron-session legacy)

---

## Rolling back

If anything goes wrong, set `AUTH_PROVIDER=iron-session` (or remove the var entirely) and redeploy. Iron-session mode is fully preserved — nothing was deleted.
