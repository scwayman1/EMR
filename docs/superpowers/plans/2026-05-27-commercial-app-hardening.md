# Commercial App Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the authenticated commercial app so recovery actions and command navigation keep signed-in users inside the product.

**Architecture:** Add focused route-integrity tests around authenticated navigation, correct known stale command routes, and replace authenticated `/` recovery exits with role-appropriate destinations. Keep route definitions inspectable without rendering server layouts.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, React Testing Library patterns already used in repo.

---

## File Structure

- Modify `src/components/ui/command-palette.tsx`: export command arrays/helpers and correct stale authenticated hrefs.
- Create `src/components/ui/command-palette.test.tsx`: validate authenticated command hrefs resolve to the app route tree.
- Modify `src/app/(patient)/portal/error.tsx`: route recovery to `/portal` instead of `/`.
- Modify `src/app/(clinician)/clinic/error.tsx`: route recovery to `/clinic` instead of `/`.
- Modify `src/app/(patient)/layout.tsx`: use `primaryRole()` when redirecting non-patient users.
- Modify `src/app/(operator)/layout.tsx`: use `primaryRole()` when redirecting non-operator users.
- Create `src/lib/navigation/app-route-map.ts`: route-tree helper used by tests.
- Create `src/lib/navigation/app-route-map.test.ts`: prove helper recognizes static, query, and dynamic routes.
- Create `src/app/(patient)/portal/error.test.tsx` and `src/app/(clinician)/clinic/error.test.tsx`: verify authenticated recovery pages do not route to `/`.

### Task 1: Route Map Helper

**Files:**
- Create: `src/lib/navigation/app-route-map.ts`
- Test: `src/lib/navigation/app-route-map.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { createAppRouteMatcher } from "./app-route-map";

describe("createAppRouteMatcher", () => {
  it("matches exact app routes and strips query strings", () => {
    const matches = createAppRouteMatcher(["/clinic", "/ops/settings/ai-config"]);

    expect(matches("/clinic")).toBe(true);
    expect(matches("/ops/settings/ai-config?tab=models")).toBe(true);
  });

  it("matches dynamic route segments", () => {
    const matches = createAppRouteMatcher(["/clinic/patients/:id", "/ops/cfo/reports/:id"]);

    expect(matches("/clinic/patients/patient_123")).toBe(true);
    expect(matches("/ops/cfo/reports/report_123")).toBe(true);
  });

  it("does not match missing sibling routes", () => {
    const matches = createAppRouteMatcher(["/clinic", "/clinic/sign-off/labs"]);

    expect(matches("/clinic/queue")).toBe(false);
    expect(matches("/clinic/labs-review")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/navigation/app-route-map.test.ts`

Expected: FAIL because `src/lib/navigation/app-route-map.ts` does not exist.

- [ ] **Step 3: Implement the helper**

```ts
export function normalizeAppHref(href: string): string {
  const path = href.split(/[?#]/)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function routeToRegex(route: string): RegExp {
  const normalized = normalizeAppHref(route);
  const pattern = normalized
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) return "[^/]+";
      if (segment === "*") return ".*";
      return escapeRegex(segment);
    })
    .join("/");
  return new RegExp(`^${pattern}$`);
}

export function createAppRouteMatcher(routes: string[]): (href: string) => boolean {
  const exactRoutes = new Set(routes.map(normalizeAppHref));
  const dynamicRoutes = routes
    .filter((route) => route.includes(":") || route.includes("*"))
    .map(routeToRegex);

  return (href: string) => {
    const normalized = normalizeAppHref(href);
    if (exactRoutes.has(normalized)) return true;
    return dynamicRoutes.some((route) => route.test(normalized));
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/navigation/app-route-map.test.ts`

Expected: PASS.

### Task 2: Command Palette Route Integrity

**Files:**
- Modify: `src/components/ui/command-palette.tsx`
- Test: `src/components/ui/command-palette.test.tsx`
- Use: `src/lib/navigation/app-route-map.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { AUTHENTICATED_COMMANDS } from "./command-palette";
import { createAppRouteMatcher } from "@/lib/navigation/app-route-map";

const APP_ROUTES = [
  "/clinic",
  "/clinic/command",
  "/clinic/messages",
  "/clinic/morning-brief",
  "/clinic/patients",
  "/clinic/providers",
  "/clinic/research",
  "/clinic/library",
  "/clinic/audit-trail",
  "/clinic/schedule",
  "/clinic/sign-off",
  "/clinic/sign-off/labs",
  "/clinic/sign-off/refills",
  "/settings/preferences",
  "/ops",
  "/ops/mission-control",
  "/ops/schedule",
  "/ops/patients",
  "/ops/queue",
  "/ops/billing",
  "/ops/scrub",
  "/ops/denials",
  "/ops/aging",
  "/ops/billing-agents",
  "/ops/revenue",
  "/ops/eligibility",
  "/ops/cfo",
  "/ops/cfo/pnl",
  "/ops/cfo/cash-flow",
  "/ops/cfo/balance-sheet",
  "/ops/cfo/expenses",
  "/ops/cfo/cash",
  "/ops/cfo/assets",
  "/ops/cfo/liabilities",
  "/ops/cfo/equity",
  "/ops/cfo/goals",
  "/ops/cfo/reports",
  "/ops/staff-schedule",
  "/ops/time-clock",
  "/ops/training",
  "/ops/policies",
  "/ops/incidents",
  "/ops/supplies",
  "/ops/vendors",
  "/ops/feedback",
  "/ops/marketing",
  "/ops/announcements",
  "/ops/onboarding",
  "/ops/launch",
  "/ops/intake-builder",
  "/ops/export",
  "/ops/analytics",
  "/ops/analytics-lab",
  "/ops/population",
  "/ops/settings/ai-config",
  "/ops/webhooks",
  "/ops/api-keys",
  "/ops/performance",
  "/ops/feature-flags",
  "/ops/backups",
  "/portal",
  "/portal/log-dose",
  "/portal/records",
  "/portal/garden",
  "/portal/community",
  "/portal/schedule",
  "/portal/messages",
  "/portal/qa",
  "/portal/profile",
];

describe("authenticated command palette routes", () => {
  it("points every authenticated command href at an existing route", () => {
    const matches = createAppRouteMatcher(APP_ROUTES);
    const missing = AUTHENTICATED_COMMANDS
      .filter((command) => command.href)
      .filter((command) => !matches(command.href!))
      .map((command) => `${command.id}: ${command.href}`);

    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ui/command-palette.test.tsx`

Expected: FAIL showing the known missing hrefs.

- [ ] **Step 3: Export command definitions and correct stale routes**

Changes:

- Export `CLINICIAN_COMMANDS`, `OPERATOR_COMMANDS`, `PATIENT_COMMANDS`, and `AUTHENTICATED_COMMANDS`.
- Change `c-open-queue` href to `/clinic`.
- Change `c-open-settings` href to `/settings/preferences`.
- Change `c-go-labs` href to `/clinic/sign-off/labs`.
- Change `c-go-refills` href to `/clinic/sign-off/refills`.
- Change `o-compose-message` href to `/clinic/messages?action=compose`.
- Change `o-open-settings` href to `/ops/settings/ai-config`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ui/command-palette.test.tsx`

Expected: PASS.

### Task 3: Authenticated Recovery Routes

**Files:**
- Modify: `src/app/(patient)/portal/error.tsx`
- Modify: `src/app/(clinician)/clinic/error.tsx`
- Test: `src/app/(patient)/portal/error.test.tsx`
- Test: `src/app/(clinician)/clinic/error.test.tsx`

- [ ] **Step 1: Write failing tests**

Patient test asserts clicking the secondary recovery button assigns `/portal`, not `/`.

Clinician test asserts clicking the secondary recovery button assigns `/clinic`, not `/`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- 'src/app/(patient)/portal/error.test.tsx' 'src/app/(clinician)/clinic/error.test.tsx'`

Expected: FAIL because existing buttons assign `/`.

- [ ] **Step 3: Implement route corrections**

Change patient `window.location.href = "/"` to `window.location.href = "/portal"` and button text to `Back to dashboard`.

Change clinician `window.location.href = "/"` to `window.location.href = "/clinic"` and button text to `Go to Today`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- 'src/app/(patient)/portal/error.test.tsx' 'src/app/(clinician)/clinic/error.test.tsx'`

Expected: PASS.

### Task 4: Primary Role Redirects

**Files:**
- Modify: `src/app/(patient)/layout.tsx`
- Modify: `src/app/(operator)/layout.tsx`

- [ ] **Step 1: Inspect existing redirect behavior**

Confirm `patient/layout.tsx` and `operator/layout.tsx` use `user.roles[0]` in rejection paths.

- [ ] **Step 2: Implement minimal correction**

Import `primaryRole` where missing and redirect via `ROLE_HOME[primaryRole(user.roles)] ?? "/"`.

- [ ] **Step 3: Run typecheck or focused compile-adjacent checks**

Run: `npm run typecheck`

Expected: PASS, or document unrelated baseline blocker.

### Task 5: Final Verification

**Files:**
- All files touched in Tasks 1-4.

- [ ] **Step 1: Run focused test suite**

Run: `npm run test -- src/lib/navigation/app-route-map.test.ts src/components/ui/command-palette.test.tsx 'src/app/(patient)/portal/error.test.tsx' 'src/app/(clinician)/clinic/error.test.tsx'`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS, or capture exact unrelated failures.

- [ ] **Step 3: Review diff**

Run: `git diff --stat && git diff --check`

Expected: no whitespace errors; diff limited to spec, plan, command palette, error pages, route helper/tests, and redirect layouts.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add src docs/superpowers/plans/2026-05-27-commercial-app-hardening.md
git commit -m "fix: harden authenticated navigation recovery"
```
