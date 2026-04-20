"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  PALETTE_ACTIONS,
  filterActionsByRole,
  type PaletteRole,
} from "@/lib/domain/palette-actions";
import {
  actionToCommand,
  filterCommands,
  filterNavByRole,
  groupCommands,
  type ActionCommand,
  type Command,
  type NavigationCommand,
  type PatientCommand,
} from "@/lib/domain/palette-helpers";
import { searchPatients } from "@/lib/domain/palette-search";

// Re-export the type union from the helpers module so existing imports of
// `Command`, `NavigationCommand`, etc. from "@/components/ui/command-palette"
// keep working.
export type {
  ActionCommand,
  Command,
  CommandKind,
  NavigationCommand,
  PatientCommand,
} from "@/lib/domain/palette-helpers";

/**
 * Global ⌘K command palette.
 *
 * Three command kinds, in priority order when results render:
 *   1. PATIENT — fuzzy server-side lookup against the Patient table, scoped
 *      to the caller's organization. Fired only when the query is 3+ chars
 *      and after a 200ms debounce.
 *   2. ACTION — declarative entries from `palette-actions.ts`. These EXECUTE
 *      something (toggle dark mode, queue a billing sweep, ...) instead of
 *      navigating to a route.
 *   3. NAVIGATION — the original behavior, jumping to a known route.
 *
 * Visual structure groups results under uppercase section headers
 * (`PATIENTS`, `ACTIONS`, `NAVIGATE`).
 *
 * Hotkeys: ⌘K toggles, ↑/↓ navigates, Enter fires, ⌘+Enter on a navigation
 * command opens in a new tab, Esc closes.
 */

// ─── Static navigation commands ──────────────────────────────────
//
// Mirrors the original COMMANDS list but typed under the new union. The
// other agent owns layout-level nav arrays — these are the palette's own
// curated quick-jump set, not the AppShell nav.

const NAVIGATION_COMMANDS: NavigationCommand[] = [
  {
    kind: "navigation",
    id: "go-patients",
    label: "Go to patients",
    href: "/clinic/patients",
    icon: "👥",
    keywords: ["roster", "list"],
    roles: ["clinician", "practice_owner"],
  },
  {
    kind: "navigation",
    id: "go-messages",
    label: "Open messages",
    href: "/clinic/messages",
    icon: "💬",
    keywords: ["inbox", "threads"],
    roles: ["clinician", "practice_owner"],
  },
  {
    kind: "navigation",
    id: "go-morning-brief",
    label: "Open morning brief",
    href: "/clinic/morning-brief",
    icon: "🌅",
    keywords: ["agenda", "today"],
    roles: ["clinician", "practice_owner"],
  },
  {
    kind: "navigation",
    id: "go-approvals",
    label: "Open approvals",
    href: "/clinic/approvals",
    icon: "✔️",
    keywords: ["drafts", "review"],
    roles: ["clinician", "practice_owner"],
  },
  {
    kind: "navigation",
    id: "go-audit",
    label: "Open audit trail",
    href: "/clinic/audit-trail",
    icon: "📜",
    keywords: ["history", "log"],
    roles: ["clinician", "practice_owner"],
  },
  {
    kind: "navigation",
    id: "start-note",
    label: "Start new note",
    hint: "Resume the current in-progress encounter",
    href: "/clinic/morning-brief?action=resume-note",
    icon: "📝",
    keywords: ["scribe", "draft", "soap"],
    roles: ["clinician", "practice_owner"],
  },
  {
    kind: "navigation",
    id: "voice-chart",
    label: "Start voice-to-chart",
    href: "/clinic/morning-brief?action=voice-chart",
    icon: "🎙️",
    keywords: ["dictate", "speech", "ambient"],
    roles: ["clinician", "practice_owner"],
  },
  {
    kind: "navigation",
    id: "new-rx",
    label: "Add new prescription",
    href: "/clinic/patients?action=new-rx",
    icon: "💊",
    keywords: ["medication", "regimen", "cannabis", "dose"],
    roles: ["clinician", "practice_owner"],
  },
  {
    kind: "navigation",
    id: "leaflet",
    label: "Generate leaflet",
    href: "/clinic/library?action=leaflet",
    icon: "📄",
    keywords: ["handout", "education", "patient", "print"],
    roles: ["clinician", "practice_owner"],
  },
  // Operator-flavored entries
  {
    kind: "navigation",
    id: "go-mission-control",
    label: "Open Mission Control",
    href: "/ops/mission-control",
    icon: "🛰️",
    keywords: ["overview", "ops", "agents"],
    roles: ["practice_owner"],
  },
  {
    kind: "navigation",
    id: "go-aging",
    label: "Open AR aging",
    href: "/ops/aging",
    icon: "📈",
    keywords: ["aging", "ar", "billing", "report"],
    roles: ["practice_owner"],
  },
  // Patient portal entries
  {
    kind: "navigation",
    id: "go-portal-home",
    label: "Open my portal",
    href: "/portal",
    icon: "🏠",
    roles: ["patient"],
  },
  {
    kind: "navigation",
    id: "go-portal-log",
    label: "Log a dose",
    href: "/portal/log-dose",
    icon: "📝",
    keywords: ["dose", "intake", "checkin"],
    roles: ["patient"],
  },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

// ─── Component ───────────────────────────────────────────────────

export interface CommandPaletteProps {
  /**
   * Roles for the current user. Used to filter commands. When omitted, the
   * palette assumes a clinician (matches today's behavior so existing mounts
   * keep working).
   */
  roles?: PaletteRole[];
}

export function CommandPalette({ roles }: CommandPaletteProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [patientHits, setPatientHits] = useState<PatientCommand[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveRoles: PaletteRole[] = roles ?? ["clinician"];
  const rolesKey = effectiveRoles.join(",");

  // Pre-filter the static lists by role once per render; cheap, no memo needed.
  const navByRole = filterNavByRole(NAVIGATION_COMMANDS, effectiveRoles);
  const actionsByRole = filterActionsByRole(PALETTE_ACTIONS, effectiveRoles);
  const actionCommands: ActionCommand[] = actionsByRole.map(actionToCommand);

  // Global open/close hotkey.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
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
      setPatientHits([]);
      setSearching(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced patient search. Fires 200ms after typing stops, only when the
  // query is 3+ chars and doesn't exactly match a static command label.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setPatientHits([]);
      setSearching(false);
      return;
    }
    const exactStaticMatch = [...navByRole, ...actionCommands].some(
      (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exactStaticMatch) {
      setPatientHits([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchPatients(trimmed)
        .then((rows) => {
          if (cancelled) return;
          setPatientHits(
            rows.map((r) => ({
              kind: "patient",
              id: r.id,
              label: r.label,
              patientId: r.patientId,
              description: r.description,
            })),
          );
        })
        .catch((err) => {
          console.error("[command-palette] patient search failed:", err);
          if (!cancelled) setPatientHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // navByRole/actionCommands derive from `effectiveRoles`; explicit deps:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, rolesKey]);

  const results = useMemo<Command[]>(() => {
    const all: Command[] = [
      ...patientHits,
      ...actionCommands,
      ...navByRole,
    ];
    return filterCommands(all, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, patientHits, rolesKey]);

  const grouped = useMemo(() => groupCommands(results), [results]);

  // Keep highlight in range when results shrink.
  useEffect(() => {
    if (highlight >= results.length) setHighlight(0);
  }, [results.length, highlight]);

  const closePalette = useCallback(() => setOpen(false), []);

  const fire = useCallback(
    (cmd: Command, opts?: { newTab?: boolean }) => {
      if (cmd.kind === "navigation") {
        if (opts?.newTab && typeof window !== "undefined") {
          window.open(cmd.href, "_blank", "noopener");
        } else {
          router.push(cmd.href);
        }
        setOpen(false);
        return;
      }
      if (cmd.kind === "patient") {
        router.push(`/clinic/patients/${cmd.patientId}`);
        setOpen(false);
        return;
      }
      // action
      try {
        void cmd.run({ router, closePalette });
      } catch (err) {
        console.error("[command-palette] action failed:", err);
      }
    },
    [router, closePalette],
  );

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
      if (cmd) fire(cmd, { newTab: e.metaKey || e.ctrlKey });
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!open) return null;

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
            placeholder="Type a command, action, or patient name…"
            className="border-0 focus:ring-0 focus:border-0 h-9 px-1 text-base"
          />
          {searching && (
            <span className="text-[11px] text-text-subtle shrink-0">
              Searching patients…
            </span>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="text-sm text-text-subtle text-center py-8">
              {query.trim()
                ? `No commands match "${query}".`
                : "Start typing — patients, actions, or pages."}
            </p>
          ) : (
            grouped.map((section) => (
              <div key={section.kind} className="mb-2 last:mb-0">
                <p className="px-4 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                  {section.label}
                </p>
                <ul>
                  {section.items.map((cmd) => {
                    const idx = results.indexOf(cmd);
                    const isActive = idx === highlight;
                    return (
                      <li key={cmd.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={(e) =>
                            fire(cmd, {
                              newTab: e.metaKey || e.ctrlKey,
                            })
                          }
                          className={cn(
                            "w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition-colors",
                            isActive
                              ? "bg-accent-soft text-accent"
                              : "hover:bg-surface-muted/60 text-text",
                          )}
                        >
                          <div className="min-w-0 flex items-start gap-2">
                            {(cmd.kind === "navigation" ||
                              cmd.kind === "action") &&
                            cmd.icon ? (
                              <span
                                aria-hidden="true"
                                className="text-base leading-tight shrink-0"
                              >
                                {cmd.icon}
                              </span>
                            ) : cmd.kind === "patient" ? (
                              <span
                                aria-hidden="true"
                                className="text-base leading-tight shrink-0"
                              >
                                👤
                              </span>
                            ) : null}
                            <div className="min-w-0">
                              <p className="text-sm truncate flex items-center gap-2">
                                {cmd.label}
                                {cmd.kind === "action" &&
                                  cmd.status === "stub" && (
                                    <span className="text-[10px] uppercase tracking-wider text-text-subtle border border-border rounded px-1 py-0.5">
                                      soon
                                    </span>
                                  )}
                              </p>
                              {cmd.kind === "navigation" && cmd.hint && (
                                <p className="text-[11px] text-text-subtle truncate">
                                  {cmd.hint}
                                </p>
                              )}
                              {cmd.kind === "action" && cmd.description && (
                                <p className="text-[11px] text-text-subtle truncate">
                                  {cmd.description}
                                </p>
                              )}
                              {cmd.kind === "patient" && cmd.description && (
                                <p className="text-[11px] text-text-subtle truncate">
                                  {cmd.description}
                                </p>
                              )}
                            </div>
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
          <span>↑ ↓ navigate · ↵ select · ⌘↵ new tab</span>
          <span>esc to close</span>
        </div>
      </Card>
    </div>
  );
}
