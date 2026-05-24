"use client";

/**
 * Patient-only quick-jump picker — Notion's quick-find, scoped to patients.
 *
 * Opens via:
 *   • The `g j` chord (Linear-style leader; documented in the help cheat
 *     sheet via the keyboard registry).
 *   • The "Find" button on the recently-viewed strip.
 *   • Any caller dispatching `window.dispatchEvent(new CustomEvent(
 *     QUICK_JUMP_OPEN_EVENT))` — handy for tests + other affordances.
 *
 * Why a dedicated chord (`g j`) and not `g p`?
 *   The existing `KeyboardShortcuts` component already binds `g p` to the
 *   roster route (see `src/lib/ui/keyboard.ts: G_LEADER_ROUTES`). Re-using
 *   the same chord would double-fire. `g j` ("jump") is non-conflicting,
 *   complements the documented set, and reads naturally next to `g p`.
 *
 * PR #466 (command palette) added a patient-search row in the global ⌘K
 * palette — this surface is *complementary*: it's a persistent affordance,
 * not a kitchen-sink palette, and it stays scoped to patients only.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { isTypingTarget } from "@/lib/ui/keyboard";

export const QUICK_JUMP_OPEN_EVENT = "emr:quick-jump:open";

interface PatientHit {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
}

const DEBOUNCE_MS = 180;
const MIN_QUERY = 2;

export function QuickJump() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<PatientHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  /* open/close glue ─────────────────────────────────────── */

  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(QUICK_JUMP_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(QUICK_JUMP_OPEN_EVENT, onOpen);
  }, []);

  // `g j` leader chord — independent listener that won't fight with the
  // single-listener `KeyboardShortcuts` component (different chord).
  React.useEffect(() => {
    let leader = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      leader = false;
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (leader && e.key.toLowerCase() === "j") {
        e.preventDefault();
        clear();
        setOpen(true);
        return;
      }
      if (e.key.toLowerCase() === "g") {
        leader = true;
        timer = setTimeout(clear, 1500);
      } else {
        // any other key cancels the leader — defer to the global handler
        if (leader) clear();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clear();
    };
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActive(0);
      // Focus the input on next tick so the dialog has rendered.
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  /* debounced search ───────────────────────────────────── */

  React.useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/patients/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        if (!res.ok) {
          setHits([]);
        } else {
          const json = (await res.json()) as { patients?: PatientHit[] };
          setHits(Array.isArray(json.patients) ? json.patients : []);
        }
      } catch (err) {
        // Aborted searches are normal as the user keeps typing.
        if ((err as { name?: string } | undefined)?.name !== "AbortError") {
          setHits([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(id);
    };
  }, [open, query]);

  /* keyboard nav inside the picker ─────────────────────── */

  const navigateTo = React.useCallback(
    (p: PatientHit) => {
      setOpen(false);
      router.push(`/clinic/patients/${p.id}`);
    },
    [router],
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) navigateTo(hit);
    }
  };

  const showEmpty = query.trim().length >= MIN_QUERY && !loading && hits.length === 0;
  const showPrompt = query.trim().length < MIN_QUERY;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          "max-w-lg w-full p-0 overflow-hidden",
          "rounded-2xl border border-border bg-surface shadow-2xl",
        )}
      >
        <DialogTitle className="sr-only">Quick-jump to a patient</DialogTitle>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/70">
          <SearchIcon className="h-4 w-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search patients by name, phone, email, or DOB…"
            aria-label="Search patients"
            className={cn(
              "flex-1 bg-transparent outline-none text-[15px] placeholder:text-text-subtle text-text",
            )}
          />
          <kbd className="hidden md:inline font-mono text-[10px] text-text-subtle bg-surface-muted px-1.5 py-0.5 rounded">
            esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {showPrompt && (
            <div className="px-4 py-6 text-center text-sm text-text-subtle">
              Type at least {MIN_QUERY} characters to find a patient.
            </div>
          )}
          {loading && !showPrompt && (
            <div className="px-4 py-6 text-center text-sm text-text-subtle">
              Searching…
            </div>
          )}
          {showEmpty && (
            <div className="px-4 py-6 text-center text-sm text-text-subtle">
              No patients match "{query}".
            </div>
          )}
          {!showPrompt && !loading && hits.length > 0 && (
            <ul role="listbox" aria-label="Patient matches" className="py-1">
              {hits.map((p, i) => {
                const isActive = i === active;
                return (
                  <li key={p.id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigateTo(p)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-accent-soft/40"
                          : "hover:bg-surface-muted/60",
                      )}
                    >
                      <Avatar
                        firstName={p.firstName}
                        lastName={p.lastName}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text truncate">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-[11px] text-text-subtle truncate">
                          {p.dateOfBirth ? `DOB ${p.dateOfBirth}` : ""}
                          {p.dateOfBirth && (p.email || p.phone) ? " · " : ""}
                          {p.email ?? p.phone ?? ""}
                        </div>
                      </div>
                      {isActive && (
                        <kbd className="font-mono text-[10px] text-text-subtle bg-surface-muted px-1.5 py-0.5 rounded">
                          ↵
                        </kbd>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border/70 flex items-center justify-between text-[10px] text-text-subtle">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate{" "}
            <kbd className="font-mono ml-1">↵</kbd> open
          </span>
          <span>Quick-jump · g j</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────────────────────── tiny inline icon */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M13.5 13.5L10.5 10.5" />
    </svg>
  );
}
