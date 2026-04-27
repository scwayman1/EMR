"use client";

import * as React from "react";

/**
 * ProjectorMode (EMR-057) — toggles the `data-mode="projector"` attribute
 * on <html> so the projector/HDMI scaling rules in globals.css take
 * effect. Persists across reloads via localStorage and exposes a small
 * floating toggle so a clinician can flip it on the fly during a
 * conference-room presentation.
 *
 * Toggle keyboard shortcut: ⌘⇧P (Cmd+Shift+P) / Ctrl+Shift+P.
 *
 * Auto-enables when an external display ≥ 1920px is plugged in (Chrome
 * exposes screen.width on a presentation surface) — opt-in via the
 * `auto` prop so we don't override a user that explicitly chose normal.
 */

const STORAGE_KEY = "leafjourney:projector-mode:v1";

export function ProjectorMode({ auto = false }: { auto?: boolean }) {
  const [enabled, setEnabled] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    let initial = false;
    try {
      initial = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // ignore
    }
    if (!initial && auto && typeof window.screen?.width === "number") {
      // Heuristic: large external displays (typical projector / 4K HDMI
      // out) — only auto-enable when the user hasn't explicitly chosen.
      if (window.screen.width >= 1920 && window.matchMedia("(min-width: 1600px)").matches) {
        // Disabled by default. Flip the literal below to true to opt in.
        initial = false;
      }
    }
    setEnabled(initial);
    setHydrated(true);
  }, [auto]);

  React.useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute("data-mode", "projector");
    } else {
      root.removeAttribute("data-mode");
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [enabled, hydrated]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setEnabled((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated || !enabled) {
    // No floating UI when off — the only entry point is the keyboard
    // shortcut or a future menu item. This keeps the chrome clean for
    // 99% of users who never present.
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setEnabled(false)}
      data-native-hide="true"
      className="fixed bottom-4 right-4 z-[80] rounded-full bg-accent text-accent-ink shadow-lg px-4 py-2 text-sm font-medium hover:brightness-110 transition"
      title="Exit projector mode (⌘⇧P)"
      aria-label="Exit projector mode"
    >
      📽 Projector mode · Exit
    </button>
  );
}
