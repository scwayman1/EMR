# MALLIK-003 — Render deploy: remove Clerk from hot boot path

- **Reporter:** Mallik (diagnosed during Dr. Patel's overnight deploy triage)
- **Owner:** Mallik
- **Status:** shipped (commit `bd40d3b` on `claude/integrate-document-upload-C0fXW`)
- **Priority:** P0 (production deploy was failing repeatedly)

## Problem

Render deploys on `claude/integrate-document-upload-C0fXW` were failing with `"Timed out while running your code"` — Render's signal for the start command not binding to a port within the platform's timeout window.

Root cause: commit `7bf2d4d` ("Clerk authentication scaffolding — feature-flagged, zero-disruption") added top-level imports of `@clerk/nextjs` and `@clerk/nextjs/server` to `src/app/layout.tsx` and `src/middleware.ts`. Even though Clerk was gated behind `AUTH_PROVIDER === "clerk"`, the imports themselves ran during Next.js module evaluation — meaning `@clerk/nextjs` initialized on every boot regardless of the flag.

Combined with the Clerk v7 ↔ Next 14 peer-dep mismatch (papered over by commit `7c446f9` adding `.npmrc` with `legacy-peer-deps=true`), this was crashing the web server before it could bind to the port Render was watching.

## Fix

Remove Clerk imports from the hot boot path until Clerk is actually wired:

- `src/middleware.ts` — replaced with a pure pass-through. Route protection stays at the layout level via `requireUser()`.
- `src/app/layout.tsx` — dropped the conditional `ClerkProvider` wrap. With `AUTH_PROVIDER=iron-session` in prod, it was a no-op anyway.

Left untouched (only load when those routes are hit):

- `src/app/(auth)/sign-in/**`, `src/app/(auth)/sign-up/**`
- `src/app/api/webhooks/clerk/route.ts`
- `src/lib/auth/clerk-session.ts` (already invoked via dynamic import from `session.ts`)

## Acceptance criteria

- [x] Commit landed on `claude/integrate-document-upload-C0fXW` (`bd40d3b`)
- [x] Pushed to origin
- [ ] Next Render deploy on that branch goes green (waiting on verification)
- [ ] `/api/health` returns 200 post-deploy

## Follow-up tickets to open

- **MALLIK-004 (pending):** Decide the Clerk integration strategy — downgrade to a Clerk version compatible with Next 14, or upgrade the project to Next 15. Current state (`legacy-peer-deps=true` + scaffolding) is unshippable.
- **MALLIK-005 (pending):** Add a post-deploy smoke test against `/api/health`, `/`, `/login` so port-bind / boot failures fail the deploy with a clear error rather than a generic "Timed out" message.
- **MALLIK-006 (pending):** Guard pattern for future optional integrations — "feature-flagged" should mean the integration's code is not loaded at module scope when the flag is off. Document the pattern (dynamic `await import()` inside the flagged branch) so the next scaffolding PR doesn't hit the same class of bug.

## References

- Failing deploys: `emr-web` @ `7c446f9` (cancelled 2026-04-16 22:50, failed 2026-04-16 23:23)
- Render event stream showed `==> Port scan timeout reached, no open ports detected. ==> Deploy cancelled`
- Fix commit: `bd40d3b fix(deploy): remove Clerk from hot boot path to unblock Render`
