"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/**
 * Global ⌘K command palette.
 *
 * Listens for ⌘K / Ctrl+K anywhere in the app, opens a centered modal with
 * a search field and a list of commands. Fuzzy-filters as the user types.
 * Arrow keys to navigate, Enter to fire, Esc to dismiss.
 *
 * Commands are split by role — clinician, operator, patient — so the
 * palette shows only the routes the current shell can reach. A role-less
 * render (no `role` prop) includes the union for dev convenience.
 *
 * Commands fall into three buckets:
 *
 *   • Navigation — quick-action shortcuts to known routes.
 *   • Actions    — parameterized links (e.g. "Start new note").
 *   • Search     — a passthrough that, when fired, sends the query to a
 *                  role-appropriate search surface (clinician → roster).
 */

export type CommandPaletteRole = "clinician" | "operator" | "patient";

interface CommandDef {
  id: string;
  label: string;
  hint?: string;
  group: string;
  /** Which role(s) this command applies to. Omit for role-agnostic. */
  roles?: CommandPaletteRole[];
  /** Either a route or a function. */
  href?: string;
  run?: (router: ReturnType<typeof useRouter>, query: string) => void;
  keywords?: string[];
}

// ───────────────────────────────────────── Clinician
const CLINICIAN_COMMANDS: CommandDef[] = [
  {
    id: "c-go-today",
    label: "Go to Today",
    href: "/clinic",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["home", "dashboard"],
  },
  {
    id: "c-go-command",
    label: "Open Command Center",
    href: "/clinic/command",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["ops", "bridge"],
  },
  {
    id: "c-go-patients",
    label: "Go to Roster",
    href: "/clinic/patients",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["roster", "list", "patients"],
  },
  {
    id: "c-go-messages",
    label: "Open Inbox",
    href: "/clinic/messages",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["inbox", "threads", "messages"],
  },
  {
    id: "c-go-morning-brief",
    label: "Open morning brief",
    href: "/clinic/morning-brief",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["agenda", "today", "brief"],
  },
  {
    id: "c-go-approvals",
    label: "Open approvals",
    href: "/clinic/approvals",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["drafts", "review", "approve"],
  },
  {
    id: "c-go-labs",
    label: "Review labs",
    href: "/clinic/labs-review",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["labs", "results"],
  },
  {
    id: "c-go-refills",
    label: "Review refills",
    href: "/clinic/refills",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["refill", "rx", "prescription"],
  },
  {
    id: "c-go-providers",
    label: "Providers directory",
    href: "/clinic/providers",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["directory", "colleagues"],
  },
  {
    id: "c-go-research",
    label: "Research feed",
    href: "/clinic/research",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["pubmed", "papers"],
  },
  {
    id: "c-go-library",
    label: "Education library",
    href: "/clinic/library",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["leaflet", "library", "handouts"],
  },
  {
    id: "c-go-audit",
    label: "Open audit trail",
    href: "/clinic/audit-trail",
    group: "Navigate",
    roles: ["clinician"],
    keywords: ["history", "log", "audit"],
  },
  {
    id: "c-start-note",
    label: "Start new note",
    hint: "Resume the current in-progress encounter",
    href: "/clinic/morning-brief?action=resume-note",
    group: "Actions",
    roles: ["clinician"],
    keywords: ["scribe", "draft", "soap", "note"],
  },
  {
    id: "c-voice-chart",
    label: "Start voice-to-chart",
    href: "/clinic/morning-brief?action=voice-chart",
    group: "Actions",
    roles: ["clinician"],
    keywords: ["dictate", "speech", "ambient"],
  },
  {
    id: "c-new-rx",
    label: "Add new prescription",
    href: "/clinic/patients?action=new-rx",
    group: "Actions",
    roles: ["clinician"],
    keywords: ["medication", "regimen", "cannabis", "dose"],
  },
  {
    id: "c-leaflet",
    label: "Generate leaflet",
    href: "/clinic/library?action=leaflet",
    group: "Actions",
    roles: ["clinician"],
    keywords: ["handout", "education", "patient", "print"],
  },
];

// ───────────────────────────────────────── Operator
const OPERATOR_COMMANDS: CommandDef[] = [
  { id: "o-overview", label: "Overview", href: "/ops", group: "Navigate", roles: ["operator"], keywords: ["home", "dashboard"] },
  { id: "o-mission", label: "Mission Control", href: "/ops/mission-control", group: "Navigate", roles: ["operator"], keywords: ["agents", "fleet"] },
  { id: "o-schedule", label: "Schedule", href: "/ops/schedule", group: "Navigate", roles: ["operator"], keywords: ["calendar", "appts"] },
  { id: "o-patients", label: "Patients", href: "/ops/patients", group: "Navigate", roles: ["operator"], keywords: ["roster"] },
  { id: "o-command", label: "Command Center (clinic)", href: "/clinic/command", group: "Navigate", roles: ["operator"], keywords: ["bridge", "clinic"] },

  { id: "o-billing", label: "Billing hub", href: "/ops/billing", group: "Billing", roles: ["operator"], keywords: ["billing", "rcm"] },
  { id: "o-scrub", label: "Scrub claims", href: "/ops/scrub", group: "Billing", roles: ["operator"], keywords: ["scrub", "claims", "clean"] },
  { id: "o-denials", label: "Work denials", href: "/ops/denials", group: "Billing", roles: ["operator"], keywords: ["denials", "deny", "work"] },
  { id: "o-aging", label: "Aging buckets", href: "/ops/aging", group: "Billing", roles: ["operator"], keywords: ["aging", "ar", "receivable"] },
  { id: "o-billing-agents", label: "Billing agents", href: "/ops/billing-agents", group: "Billing", roles: ["operator"], keywords: ["agents", "fleet", "rcm"] },
  { id: "o-revenue", label: "Revenue", href: "/ops/revenue", group: "Billing", roles: ["operator"], keywords: ["revenue", "collections"] },
  { id: "o-eligibility", label: "Eligibility checks", href: "/ops/eligibility", group: "Billing", roles: ["operator"], keywords: ["eligibility", "verify", "insurance"] },

  { id: "o-cfo", label: "CFO overview", href: "/ops/cfo", group: "Office of the CFO", roles: ["operator"], keywords: ["cfo", "finance", "controller", "books"] },
  { id: "o-cfo-pnl", label: "P&L", href: "/ops/cfo/pnl", group: "Office of the CFO", roles: ["operator"], keywords: ["pnl", "profit", "loss", "income statement"] },
  { id: "o-cfo-cash-flow", label: "Cash flow statement", href: "/ops/cfo/cash-flow", group: "Office of the CFO", roles: ["operator"], keywords: ["cash flow", "statement", "burn", "runway"] },
  { id: "o-cfo-balance-sheet", label: "Balance sheet", href: "/ops/cfo/balance-sheet", group: "Office of the CFO", roles: ["operator"], keywords: ["balance sheet", "assets", "liabilities", "equity"] },
  { id: "o-cfo-expenses", label: "Expenses", href: "/ops/cfo/expenses", group: "Office of the CFO", roles: ["operator"], keywords: ["expenses", "bills", "vendors"] },
  { id: "o-cfo-cash", label: "Cash & banks", href: "/ops/cfo/cash", group: "Office of the CFO", roles: ["operator"], keywords: ["cash", "bank", "checking", "merchant"] },
  { id: "o-cfo-assets", label: "Fixed assets", href: "/ops/cfo/assets", group: "Office of the CFO", roles: ["operator"], keywords: ["assets", "equipment", "depreciation"] },
  { id: "o-cfo-liabilities", label: "Liabilities", href: "/ops/cfo/liabilities", group: "Office of the CFO", roles: ["operator"], keywords: ["liabilities", "loans", "debt", "credit"] },
  { id: "o-cfo-equity", label: "Equity", href: "/ops/cfo/equity", group: "Office of the CFO", roles: ["operator"], keywords: ["equity", "capital", "distributions", "owner"] },
  { id: "o-cfo-goals", label: "Financial goals", href: "/ops/cfo/goals", group: "Office of the CFO", roles: ["operator"], keywords: ["goals", "targets", "kpi"] },
  { id: "o-cfo-reports", label: "Reports archive", href: "/ops/cfo/reports", group: "Office of the CFO", roles: ["operator"], keywords: ["reports", "archive", "history"] },

  { id: "o-staff-schedule", label: "Staff schedule", href: "/ops/staff-schedule", group: "Operations", roles: ["operator"], keywords: ["shifts", "staff"] },
  { id: "o-time-clock", label: "Time clock", href: "/ops/time-clock", group: "Operations", roles: ["operator"], keywords: ["clock", "punch", "timesheet"] },
  { id: "o-training", label: "Training", href: "/ops/training", group: "Operations", roles: ["operator"], keywords: ["learn", "compliance"] },
  { id: "o-policies", label: "Policies", href: "/ops/policies", group: "Operations", roles: ["operator"], keywords: ["policy", "sop"] },
  { id: "o-incidents", label: "Incidents", href: "/ops/incidents", group: "Operations", roles: ["operator"], keywords: ["incident", "report"] },
  { id: "o-supplies", label: "Supplies", href: "/ops/supplies", group: "Operations", roles: ["operator"], keywords: ["inventory", "order"] },
  { id: "o-vendors", label: "Vendors", href: "/ops/vendors", group: "Operations", roles: ["operator"], keywords: ["vendor", "supplier"] },
  { id: "o-feedback", label: "Feedback", href: "/ops/feedback", group: "Operations", roles: ["operator"], keywords: ["feedback", "review"] },
  { id: "o-marketing", label: "Marketing", href: "/ops/marketing", group: "Operations", roles: ["operator"], keywords: ["campaign", "market"] },
  { id: "o-announcements", label: "Announcements", href: "/ops/announcements", group: "Operations", roles: ["operator"], keywords: ["announce", "post"] },

  { id: "o-onboarding", label: "Onboarding", href: "/ops/onboarding", group: "Practice Setup", roles: ["operator"], keywords: ["setup", "onboard"] },
  { id: "o-launch", label: "Practice launch", href: "/ops/launch", group: "Practice Setup", roles: ["operator"], keywords: ["launch", "go-live"] },
  { id: "o-intake-builder", label: "Intake Builder", href: "/ops/intake-builder", group: "Practice Setup", roles: ["operator"], keywords: ["intake", "form", "builder"] },
  { id: "o-export", label: "Export data", href: "/ops/export", group: "Practice Setup", roles: ["operator"], keywords: ["export", "download", "csv"] },

  { id: "o-analytics", label: "Analytics", href: "/ops/analytics", group: "Intelligence", roles: ["operator"], keywords: ["dashboard", "metrics"] },
  { id: "o-analytics-lab", label: "Analytics Lab", href: "/ops/analytics-lab", group: "Intelligence", roles: ["operator"], keywords: ["lab", "analytics"] },
  { id: "o-population", label: "Population health", href: "/ops/population", group: "Intelligence", roles: ["operator"], keywords: ["cohort", "population"] },

  { id: "o-ai-config", label: "AI Config", href: "/ops/settings/ai-config", group: "System", roles: ["operator"], keywords: ["ai", "llm", "settings"] },
  { id: "o-webhooks", label: "Webhooks", href: "/ops/webhooks", group: "System", roles: ["operator"], keywords: ["webhook", "integration"] },
  { id: "o-api-keys", label: "API keys", href: "/ops/api-keys", group: "System", roles: ["operator"], keywords: ["api", "keys", "token"] },
  { id: "o-performance", label: "Performance", href: "/ops/performance", group: "System", roles: ["operator"], keywords: ["perf", "monitor"] },
  { id: "o-feature-flags", label: "Feature flags", href: "/ops/feature-flags", group: "System", roles: ["operator"], keywords: ["flag", "feature", "toggle"] },
  { id: "o-backups", label: "Backups", href: "/ops/backups", group: "System", roles: ["operator"], keywords: ["backup", "restore"] },
];

// ───────────────────────────────────────── Patient
const PATIENT_COMMANDS: CommandDef[] = [
  { id: "p-home", label: "Home", href: "/portal", group: "Navigate", roles: ["patient"], keywords: ["home", "dashboard"] },
  { id: "p-log-dose", label: "Log Dose", href: "/portal/log-dose", group: "Navigate", roles: ["patient"], keywords: ["dose", "log", "intake"] },
  { id: "p-health", label: "My Records", href: "/portal/records", group: "Navigate", roles: ["patient"], keywords: ["records", "health", "results"] },
  { id: "p-journey", label: "My Garden", href: "/portal/garden", group: "Navigate", roles: ["patient"], keywords: ["journey", "lifestyle", "garden"] },
  { id: "p-chatlearn", label: "Chat & Learn", href: "/portal/community", group: "Navigate", roles: ["patient"], keywords: ["community", "chat", "learn", "research", "chatcb", "wheel"] },
  { id: "p-schedule", label: "Schedule", href: "/portal/schedule", group: "Navigate", roles: ["patient"], keywords: ["appointment", "book"] },
  { id: "p-messages", label: "Messages", href: "/portal/messages", group: "Navigate", roles: ["patient"], keywords: ["message", "inbox", "chat"] },
  { id: "p-qa", label: "Q&A", href: "/portal/qa", group: "Navigate", roles: ["patient"], keywords: ["question", "answer", "faq"] },
  { id: "p-account", label: "Account", href: "/portal/profile", group: "Navigate", roles: ["patient"], keywords: ["profile", "settings", "account"] },
];

const ALL_COMMANDS: CommandDef[] = [
  ...CLINICIAN_COMMANDS,
  ...OPERATOR_COMMANDS,
  ...PATIENT_COMMANDS,
];

// Lightweight subsequence-fuzzy score: returns a number where higher is
// better, or -Infinity if the query characters aren't present in order.
function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 1000 - t.indexOf(q); // contiguous match wins
  let qi = 0;
  let lastHit = -1;
  let runs = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      if (lastHit !== i - 1) runs++;
      lastHit = i;
      qi++;
    }
  }
  if (qi < q.length) return -Infinity;
  return 100 - runs * 5 - t.length * 0.1;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

export interface CommandPaletteProps {
  /**
   * Current role. Filters the command list so each shell only sees its own
   * routes. Omit to include the full union (useful in dev / storybook).
   */
  role?: CommandPaletteRole;
}

export function CommandPalette({ role }: CommandPaletteProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global open/close hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        // Always allow toggle, even from a field — that's the point of ⌘K.
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // Esc inside the modal is handled below; this catches Esc when the
      // input is somehow not focused.
      if (e.key === "Escape" && open && !isTypingTarget(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Reset state when the modal opens, focus the input on next tick.
  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      // Defer to ensure the input is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const scoped = useMemo(() => {
    if (!role) return ALL_COMMANDS;
    return ALL_COMMANDS.filter((c) => !c.roles || c.roles.includes(role));
  }, [role]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    const scored = scoped
      .map((cmd) => {
        const haystack = [cmd.label, cmd.hint ?? "", ...(cmd.keywords ?? [])]
          .join(" ")
          .toLowerCase();
        const score = fuzzyScore(trimmed, haystack);
        return { cmd, score };
      })
      .filter((c) => c.score > -Infinity);

    scored.sort((a, b) => b.score - a.score);
    const out = scored.map((s) => s.cmd);

    // Role-aware search passthrough. Clinician gets the existing roster
    // filter; operator gets the ops patients list; patient has nothing
    // searchable of that shape so no passthrough there.
    if (trimmed.length > 0) {
      if (role === "clinician" || role === undefined) {
        out.unshift({
          id: "search-clinician-patients",
          label: `Search patients: "${trimmed}"`,
          hint: "Open the roster filtered by this query",
          group: "Search",
          run: (r, q) =>
            r.push(`/clinic/patients?q=${encodeURIComponent(q)}`),
        });
      } else if (role === "operator") {
        out.unshift({
          id: "search-operator-patients",
          label: `Search patients: "${trimmed}"`,
          hint: "Open the ops roster filtered by this query",
          group: "Search",
          run: (r, q) =>
            r.push(`/ops/patients?q=${encodeURIComponent(q)}`),
        });
      }
    }
    return out;
  }, [query, scoped, role]);

  // Keep highlight in range when results shrink.
  useEffect(() => {
    if (highlight >= results.length) setHighlight(0);
  }, [results.length, highlight]);

  const fire = (cmd: CommandDef) => {
    setOpen(false);
    if (cmd.run) {
      cmd.run(router, query.trim());
    } else if (cmd.href) {
      router.push(cmd.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, results.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = results[highlight];
      if (cmd) fire(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!open) return null;

  // Group results by group for a sectioned list. Preserve order.
  const grouped: { group: string; items: CommandDef[] }[] = [];
  for (const cmd of results) {
    const last = grouped[grouped.length - 1];
    if (last && last.group === cmd.group) last.items.push(cmd);
    else grouped.push({ group: cmd.group, items: [cmd] });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-text/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Card
        tone="raised"
        className="w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2 flex items-center gap-2">
          <span aria-hidden="true" className="text-text-subtle text-sm">
            ⌘K
          </span>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="border-0 focus:ring-0 focus:border-0 h-9 px-1 text-base"
            // The wrapper Card has the focus styling; the input itself stays bare.
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="text-sm text-text-subtle text-center py-8">
              No commands match "{query}".
            </p>
          ) : (
            grouped.map((section) => (
              <div key={section.group} className="mb-2 last:mb-0">
                <p className="px-4 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                  {section.group}
                </p>
                <ul>
                  {section.items.map((cmd) => {
                    // Find the global index for highlighting.
                    const idx = results.indexOf(cmd);
                    const isActive = idx === highlight;
                    return (
                      <li key={cmd.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={() => fire(cmd)}
                          className={cn(
                            "w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition-colors",
                            isActive
                              ? "bg-accent-soft text-accent"
                              : "hover:bg-surface-muted/60 text-text",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm truncate">{cmd.label}</p>
                            {cmd.hint && (
                              <p className="text-[11px] text-text-subtle truncate">
                                {cmd.hint}
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="text-[11px] text-accent shrink-0"
                            >
                              ↵
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-surface-muted/40 text-[11px] text-text-subtle flex items-center justify-between">
          <span>↑ ↓ to navigate · ↵ to select</span>
          <span>esc to close</span>
        </div>
      </Card>
    </div>
  );
}
