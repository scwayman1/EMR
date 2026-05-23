"use client";

/**
 * Linear-style keyboard cheat sheet.
 *
 * Rendered by `KeyboardShortcuts` when the user presses `?`. Reads its
 * content from the single source of truth at `src/lib/ui/keyboard.ts`, so
 * registry edits are reflected here for free.
 *
 * UX:
 *   • Centered card with backdrop blur (matches CommandPalette aesthetic).
 *   • Sections: Navigation, Lists, Actions.
 *   • Each row: <kbd> chips on the right, label + description on the left.
 *   • Click backdrop or press Esc to dismiss.
 */

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import {
  GLOBAL_SHORTCUTS,
  type ShortcutDescriptor,
} from "@/lib/ui/keyboard";

export interface KeyboardHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTION_ORDER: ShortcutDescriptor["section"][] = [
  "Navigation",
  "Lists",
  "Actions",
  "Global",
];

export function KeyboardHelpModal({ open, onClose }: KeyboardHelpModalProps) {
  // Lock body scroll while the cheat sheet is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: GLOBAL_SHORTCUTS.filter((s) => s.section === section),
  })).filter((g) => g.items.length > 0);

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
        className="w-full max-w-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
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
        </header>

        <div className="px-6 py-5 grid sm:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto">
          {grouped.map(({ section, items }) => (
            <section key={section}>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
                {section}
              </p>
              <ul className="space-y-1.5">
                {items.map((s) => (
                  <li
                    key={`${section}-${s.keys}`}
                    className="flex items-start justify-between gap-4 py-1"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-text">{s.label}</p>
                      {s.description && (
                        <p className="text-[11px] text-text-subtle truncate">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <ShortcutKeys combo={s.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="px-6 py-3 border-t border-border bg-surface-muted/40 text-[11px] text-text-subtle flex items-center justify-between">
          <span>
            Press <Kbd>?</Kbd> any time to reopen.
          </span>
          <span>
            <Kbd>Esc</Kbd> to close
          </span>
        </footer>
      </Card>
    </div>
  );
}

function ShortcutKeys({ combo }: { combo: string }) {
  // Split on space → sequence (e.g. "g h"); split on "+" within a token →
  // simultaneous chord (e.g. "cmd+k"). Render with a "then" between
  // sequenced presses and a "+" between chord parts.
  const seq = combo.split(/\s+/).filter(Boolean);
  return (
    <span className="flex items-center gap-1 shrink-0 mt-0.5">
      {seq.map((token, i) => {
        const chord = token.split("+").filter(Boolean);
        return (
          <span key={i} className="flex items-center gap-1">
            {chord.map((part, j) => (
              <span key={j} className="flex items-center gap-1">
                <Kbd>{prettyKey(part)}</Kbd>
                {j < chord.length - 1 && (
                  <span className="text-text-subtle text-xs">+</span>
                )}
              </span>
            ))}
            {i < seq.length - 1 && (
              <span className="text-text-subtle text-xs">then</span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function prettyKey(part: string): string {
  const map: Record<string, string> = {
    cmd: "⌘",
    meta: "⌘",
    ctrl: "Ctrl",
    alt: "⌥",
    opt: "⌥",
    option: "⌥",
    shift: "⇧",
    enter: "↵",
    return: "↵",
    esc: "Esc",
    escape: "Esc",
    space: "Space",
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
  };
  const k = part.toLowerCase();
  return map[k] ?? part;
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
