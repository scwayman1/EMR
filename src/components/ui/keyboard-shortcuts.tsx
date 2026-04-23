"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

/**
 * Global keyboard shortcuts for the clinician shell.
 *
 * - "g" is a leader key: press g, then within ~1.5s another letter to jump.
 * - "?" opens a cheat sheet modal.
 * - "/" focuses the page's primary search input (any [type=search] or
 *   [data-page-search]).
 * - "esc" closes the modal.
 *
 * The component is invisible until the cheat sheet opens, so it can be
 * mounted globally without affecting layout.
 */

interface Shortcut {
  category: string;
  keys: string;
  label: string;
  description?: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { category: "Navigate", keys: "g h", label: "Home (Command)" },
  { category: "Navigate", keys: "g p", label: "Patients" },
  { category: "Navigate", keys: "g i", label: "Inbox / Messages" },
  { category: "Navigate", keys: "g a", label: "Approvals" },
  { category: "Navigate", keys: "g m", label: "Morning Brief" },
  // Actions
  { category: "Actions", keys: "/", label: "Focus search on this page" },
  { category: "Actions", keys: "?", label: "Show this help" },
  { category: "Actions", keys: "esc", label: "Close any modal" },
];

const NAV_MAP: Record<string, string> = {
  h: "/clinic",
  p: "/clinic/patients",
  i: "/clinic/messages",
  a: "/clinic/approvals",
  m: "/clinic/morning-brief",
};

// Don't intercept keystrokes while the user is typing into a field.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [leaderActive, setLeaderActive] = useState(false);

  useEffect(() => {
    let leaderTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearLeader = () => {
      if (leaderTimeout) clearTimeout(leaderTimeout);
      leaderTimeout = null;
      setLeaderActive(false);
    };

    const handler = (e: KeyboardEvent) => {
      // Always allow Escape, even from inside fields, to close our modal.
      if (e.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
          e.preventDefault();
        }
        clearLeader();
        return;
      }

      // Ignore modifier-laden combos (those belong to Command Palette etc).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Don't fight with form fields.
      if (isTypingTarget(e.target)) return;

      // Slash → focus the page's search input (if any).
      if (e.key === "/") {
        const search =
          document.querySelector<HTMLInputElement>(
            "[data-page-search]",
          ) ??
          document.querySelector<HTMLInputElement>(
            "input[type='search']",
          );
        if (search) {
          e.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }

      // Question mark (typically shift+/) → toggle help.
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      // Leader key handling
      if (leaderActive) {
        const target = NAV_MAP[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        clearLeader();
        return;
      }

      if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        setLeaderActive(true);
        leaderTimeout = setTimeout(clearLeader, 1500);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (leaderTimeout) clearTimeout(leaderTimeout);
    };
  }, [router, helpOpen, leaderActive]);

  return (
    <>
      {leaderActive && <LeaderHint />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}

function LeaderHint() {
  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-none">
      <div className="rounded-full bg-text/85 text-bg px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur">
        <span className="font-mono mr-1">g</span> awaiting next key…
      </div>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  // Group shortcuts by category for the ⌘K-style layout.
  const grouped = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        tone="raised"
        className="w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
              Help
            </p>
            <h2 className="font-display text-lg text-text tracking-tight">
              Keyboard shortcuts
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-text-subtle hover:text-text text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
                {category}
              </p>
              <ul className="space-y-1.5">
                {items.map((s) => (
                  <li
                    key={s.keys}
                    className="flex items-center justify-between gap-4 py-1"
                  >
                    <span className="text-sm text-text">{s.label}</span>
                    <ShortcutKeys combo={s.keys} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-muted/40 text-[11px] text-text-subtle">
          Press <Kbd>?</Kbd> any time to reopen this list.
        </div>
      </Card>
    </div>
  );
}

function ShortcutKeys({ combo }: { combo: string }) {
  const parts = combo.split(" ");
  return (
    <span className="flex items-center gap-1">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <Kbd>{p}</Kbd>
          {i < parts.length - 1 && (
            <span className="text-text-subtle text-xs">then</span>
          )}
        </span>
      ))}
    </span>
  );
}

function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[24px] h-6 px-1.5",
        "rounded-md border border-border-strong bg-surface text-[11px] font-mono text-text shadow-sm",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
