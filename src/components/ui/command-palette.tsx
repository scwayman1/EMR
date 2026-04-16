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
 * a search field and a list of commands. Fuzzy-filters as the clinician
 * types. Arrow keys to navigate, Enter to fire, Esc to dismiss.
 *
 * Commands fall into two buckets:
 *
 *   • Navigation / quick-action shortcuts to known routes.
 *   • A "Search patients: <name>" passthrough that, when fired, sends the
 *     query to /clinic/patients?q=<query> so the existing roster page does
 *     the heavy lifting.
 */

interface CommandDef {
  id: string;
  label: string;
  hint?: string;
  group: string;
  /** Either a route or a function. */
  href?: string;
  run?: (router: ReturnType<typeof useRouter>, query: string) => void;
  keywords?: string[];
}

const COMMANDS: CommandDef[] = [
  {
    id: "go-patients",
    label: "Go to patients",
    href: "/clinic/patients",
    group: "Navigate",
    keywords: ["roster", "list"],
  },
  {
    id: "go-messages",
    label: "Open messages",
    href: "/clinic/messages",
    group: "Navigate",
    keywords: ["inbox", "threads"],
  },
  {
    id: "go-morning-brief",
    label: "Open morning brief",
    href: "/clinic/morning-brief",
    group: "Navigate",
    keywords: ["agenda", "today"],
  },
  {
    id: "go-approvals",
    label: "Open approvals",
    href: "/clinic/approvals",
    group: "Navigate",
    keywords: ["drafts", "review"],
  },
  {
    id: "go-audit",
    label: "Open audit trail",
    href: "/clinic/audit-trail",
    group: "Navigate",
    keywords: ["history", "log"],
  },
  {
    id: "start-note",
    label: "Start new note",
    hint: "Resume the current in-progress encounter",
    href: "/clinic/morning-brief?action=resume-note",
    group: "Actions",
    keywords: ["scribe", "draft", "soap"],
  },
  {
    id: "voice-chart",
    label: "Start voice-to-chart",
    href: "/clinic/morning-brief?action=voice-chart",
    group: "Actions",
    keywords: ["dictate", "speech", "ambient"],
  },
  {
    id: "new-rx",
    label: "Add new prescription",
    href: "/clinic/patients?action=new-rx",
    group: "Actions",
    keywords: ["medication", "regimen", "cannabis", "dose"],
  },
  {
    id: "leaflet",
    label: "Generate leaflet",
    href: "/clinic/library?action=leaflet",
    group: "Actions",
    keywords: ["handout", "education", "patient", "print"],
  },
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

export function CommandPalette() {
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

  const results = useMemo(() => {
    const trimmed = query.trim();
    const scored = COMMANDS.map((cmd) => {
      const haystack = [cmd.label, cmd.hint ?? "", ...(cmd.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      const score = fuzzyScore(trimmed, haystack);
      return { cmd, score };
    }).filter((c) => c.score > -Infinity);

    scored.sort((a, b) => b.score - a.score);
    const out = scored.map((s) => s.cmd);

    // Always offer the patient search passthrough when there is a query.
    if (trimmed.length > 0) {
      out.unshift({
        id: "search-patients-passthrough",
        label: `Search patients: "${trimmed}"`,
        hint: "Open the roster filtered by this query",
        group: "Search",
        run: (r, q) =>
          r.push(`/clinic/patients?q=${encodeURIComponent(q)}`),
      });
    }
    return out;
  }, [query]);

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
