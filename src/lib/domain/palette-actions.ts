/**
 * Command palette ACTIONS.
 *
 * These are the things the palette can DO (as opposed to navigate to). Each
 * entry is purely declarative — the `run` handler is invoked from inside the
 * palette component with a `router` and a `closePalette` callback.
 *
 * The palette imports this module directly (no React, no Prisma at the top
 * level) so the action list itself is unit-testable.
 *
 * Design rules:
 *   - Every action is role-gated. Practice-owner-only actions never appear
 *     for clinicians, etc.
 *   - Stub handlers must not silently no-op. They post a friendly toast / alert
 *     so the user knows the action was received and the backend is pending.
 *   - Real handlers (toggle dark mode, fire dispatch event) live in this file
 *     too so palette-actions stays the single source of truth.
 *
 * Backend coverage:
 *   - REAL: toggle dark mode (purely client-side localStorage flip)
 *   - REAL: aging sweep / reconciliation run (existing dispatch events) — but
 *     the `run` here only TRIGGERS the route to the existing /ops page that
 *     dispatches them, since dispatch is a server action. The companion
 *     server action stub `triggerBillingDispatch` is in palette-search.ts.
 *   - STUB: revenue export, approve clean claims, pause RCM fleet, sign all
 *     drafts, ack all info observations, open today's first appointment,
 *     keyboard shortcut help — each shows "queued — backend coming soon."
 */

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type PaletteRole = "clinician" | "practice_owner" | "patient";

/**
 * Context passed to every action handler. Kept tiny and synchronous-friendly
 * so handlers can be tested without rendering a component.
 */
export interface ActionContext {
  router: AppRouterInstance;
  closePalette: () => void;
  /** Toast / alert sink. Defaults to window.alert in the browser. */
  notify?: (message: string) => void;
}

export interface PaletteActionDefinition {
  id: string;
  label: string;
  description?: string;
  /** Extra search terms for fuzzy matching. */
  keywords?: string[];
  /** Roles allowed to see this action. Empty / undefined => all roles. */
  roles?: PaletteRole[];
  /** Marks stub vs real backing — surfaced in the UI as a "soon" hint. */
  status: "real" | "stub";
  /** Single-emoji icon, kept simple to stay lightweight. */
  icon?: string;
  run: (ctx: ActionContext) => Promise<void> | void;
}

/**
 * The default notify function. Window.alert is intentionally chosen — there
 * is no toast system in the codebase yet, and an alert is unmissable for a
 * stub action while we wire real backends.
 */
function defaultNotify(message: string): void {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-alert
    window.alert(message);
  } else {
    console.log("[palette-action]", message);
  }
}

function notifyStub(ctx: ActionContext, what: string): void {
  const notify = ctx.notify ?? defaultNotify;
  notify(`${what}\n\nQueued — backend coming soon.`);
}

/**
 * Real, client-side dark-mode toggle. Mirrors the logic in
 * src/components/ui/theme-toggle.tsx so calling this from the palette has
 * the exact same effect as clicking the toggle button.
 */
export function toggleDarkMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const current =
    (localStorage.getItem("leafjourney-theme") as "light" | "dark" | null) ??
    (document.documentElement.getAttribute("data-theme") as
      | "light"
      | "dark"
      | null) ??
    "light";
  const next: "light" | "dark" = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("leafjourney-theme", next);
  return next;
}

export const PALETTE_ACTIONS: PaletteActionDefinition[] = [
  // ── practice_owner ─────────────────────────────────────────────
  {
    id: "act-export-revenue-csv",
    label: "Export last week's revenue as CSV",
    description: "Generates a CSV of payments posted in the past 7 days",
    icon: "💰",
    keywords: ["csv", "revenue", "billing", "download", "export"],
    roles: ["practice_owner"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): wire to /api/ops/revenue/export?range=7d once the
      // CSV endpoint exists. For now, jump to the revenue page so the user
      // can hit the existing per-page export.
      ctx.closePalette();
      ctx.router.push("/ops/revenue");
      notifyStub(ctx, "Revenue export requested.");
    },
  },
  {
    id: "act-approve-clean-claims",
    label: "Approve all clean claims (no scrub warnings)",
    description: "Bulk-approves every claim with a clean scrub status",
    icon: "✅",
    keywords: ["claims", "approve", "billing", "scrub", "clean"],
    roles: ["practice_owner"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): call a "use server" action approveAllCleanClaims().
      // The billing module is owned by another agent; stubbed for now.
      ctx.closePalette();
      notifyStub(ctx, "Bulk-approve clean claims requested.");
    },
  },
  {
    id: "act-run-aging-now",
    label: "Run aging report now",
    description: "Triggers the billing.aging.sweep workflow immediately",
    icon: "📊",
    keywords: ["aging", "ar", "billing", "report", "sweep"],
    roles: ["practice_owner"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): server action that calls
      // dispatch({ name: "billing.aging.sweep", organizationId: ... }).
      // Cannot dispatch directly from the client; the wiring belongs in a
      // server action under src/app/(operator)/ops/aging/actions.ts which is
      // outside this PR's scope.
      ctx.closePalette();
      ctx.router.push("/ops/aging");
      notifyStub(ctx, "Aging sweep dispatch requested.");
    },
  },
  {
    id: "act-run-reconciliation-now",
    label: "Run reconciliation now",
    description: "Triggers the billing.reconciliation.run workflow",
    icon: "🔁",
    keywords: ["reconciliation", "billing", "reconcile", "payments"],
    roles: ["practice_owner"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): same pattern as aging — needs a server action wrapper.
      ctx.closePalette();
      ctx.router.push("/ops/billing");
      notifyStub(ctx, "Reconciliation run requested.");
    },
  },
  {
    id: "act-pause-rcm-fleet",
    label: "Pause RCM agent fleet (emergency)",
    description: "Stops every billing agent from picking up new jobs",
    icon: "🛑",
    keywords: ["pause", "stop", "agents", "rcm", "billing", "emergency", "kill"],
    roles: ["practice_owner"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): set a "paused" feature flag via the existing
      // feature-flags admin page, or a dedicated emergency stop server
      // action. Either way, gated by practice_owner.
      ctx.closePalette();
      ctx.router.push("/ops/billing-agents");
      notifyStub(ctx, "RCM fleet pause requested. Verify on the agents page.");
    },
  },

  // ── clinician ──────────────────────────────────────────────────
  {
    id: "act-open-first-appointment",
    label: "Open today's first appointment",
    description: "Jumps to the patient chart for your earliest visit today",
    icon: "📅",
    keywords: ["appointment", "today", "first", "schedule", "patient"],
    roles: ["clinician", "practice_owner"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): call a server action openFirstAppointmentToday() that
      // does Appointment.findFirst({ where: providerId, startAt today },
      // orderBy: { startAt: "asc" } }) and returns the patient id. For now
      // we hop to the morning brief which already lists today's patients.
      ctx.closePalette();
      ctx.router.push("/clinic/morning-brief");
      notifyStub(ctx, "Opening today's schedule. First-visit jump coming soon.");
    },
  },
  {
    id: "act-sign-my-drafts",
    label: "Sign all draft notes I drafted",
    description: "Bulk-finalizes every note still in draft authored by you",
    icon: "🖋️",
    keywords: ["sign", "notes", "drafts", "finalize", "approve"],
    roles: ["clinician", "practice_owner"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): server action signAllOwnDraftNotes() that flips Note
      // rows where authorUserId = currentUser, status = draft to status =
      // signed (and stamps finalizedAt). Approval semantics live in
      // src/app/(clinician)/clinic/approvals/actions.ts.
      ctx.closePalette();
      ctx.router.push("/clinic/approvals");
      notifyStub(ctx, "Bulk-sign drafts requested.");
    },
  },
  {
    id: "act-ack-info-observations",
    label: "Acknowledge all info-severity observations on my patients",
    description: "Clears the low-priority observation badges from your roster",
    icon: "👁️",
    keywords: ["observations", "acknowledge", "ack", "info", "badges"],
    roles: ["clinician", "practice_owner"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): server action ackAllInfoObservations(providerId).
      ctx.closePalette();
      notifyStub(ctx, "Info-severity ack requested.");
    },
  },

  // ── all roles ──────────────────────────────────────────────────
  {
    id: "act-toggle-dark-mode",
    label: "Toggle dark mode",
    description: "Flip the theme — saved in this browser",
    icon: "🌗",
    keywords: ["theme", "dark", "light", "appearance"],
    status: "real",
    run: (ctx) => {
      const next = toggleDarkMode();
      ctx.closePalette();
      const notify = ctx.notify;
      // Don't pop an alert for a real, instant action — that's friction.
      // Only call notify when an explicit one is provided (tests).
      if (notify) notify(`Theme switched to ${next}.`);
    },
  },
  {
    id: "act-keyboard-help",
    label: "Open keyboard shortcut help",
    description: "Show every shortcut available in the EMR",
    icon: "⌨️",
    keywords: ["shortcuts", "keys", "help", "?"],
    status: "stub",
    run: (ctx) => {
      // TODO(palette): there is a KeyboardShortcuts component that opens on
      // "?". Triggering it from here requires either a custom event or a
      // dedicated /help route. Stubbed: navigate to the morning brief and
      // hint the user to press "?".
      ctx.closePalette();
      const notify = ctx.notify ?? defaultNotify;
      notify("Press '?' anywhere in the app to open the shortcut cheat sheet.");
    },
  },
];

/**
 * Return only those actions that the given role list is allowed to see.
 * Pure function, exported for testability.
 */
export function filterActionsByRole(
  actions: PaletteActionDefinition[],
  roles: PaletteRole[],
): PaletteActionDefinition[] {
  return actions.filter((a) => {
    if (!a.roles || a.roles.length === 0) return true;
    return a.roles.some((r) => roles.includes(r));
  });
}
