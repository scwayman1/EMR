"use client";

import * as React from "react";
import { LeafSprig } from "@/components/ui/ornament";

// EMR-136: AI Consciousness Overlay — "WE ARE THE COMPETITION"
//
// A heart-centric mission overlay clinicians can summon mid-shift to
// re-anchor on what the platform is for. Triggered by Cmd/Ctrl+Shift+M
// (M for "mission") or by clicking the small ✦ in the AppShell footer.
// Renders the four pillars + a rotating attestation drawn from the
// platform's working principles. Auto-fades after 18s if untouched so it
// never blocks critical workflow.

const PILLARS = [
  {
    title: "Heart-centric care",
    body: "Every interaction in this EMR is designed to reduce suffering. Tools that obstruct care are removed.",
  },
  {
    title: "Patient as co-author",
    body: "The patient owns their story. We capture in their words, on their terms, in seconds.",
  },
  {
    title: "AI that yields to humans",
    body: "Models draft. Clinicians decide. Audit trails remember. The clinician is always sovereign.",
  },
  {
    title: "We are the competition",
    body: "Epic, Cerner, Athena: this is the bar. Faster notes. Fewer clicks. Real outcomes. No fax machines.",
  },
];

const ATTESTATIONS = [
  "You signed in to ease pain today. The system will keep up with you.",
  "Documentation is in service of care, not the other way around.",
  "Your time is the costliest input in this clinic. Spend it on the patient.",
  "If a workflow steals five seconds you cannot get back, file it. We will fix it.",
  "The model is a scribe. You are the doctor.",
];

export function ConsciousnessOverlay() {
  const [open, setOpen] = React.useState(false);
  const [attestation, setAttestation] = React.useState(ATTESTATIONS[0]);
  const fadeTimer = React.useRef<number | null>(null);

  const close = React.useCallback(() => {
    setOpen(false);
    if (fadeTimer.current) {
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
  }, []);

  const show = React.useCallback(() => {
    setAttestation(ATTESTATIONS[Math.floor(Math.random() * ATTESTATIONS.length)]);
    setOpen(true);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => setOpen(false), 18_000);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.shiftKey && (e.key === "M" || e.key === "m")) {
        e.preventDefault();
        if (open) close();
        else show();
      }
      if (e.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show, close]);

  // Expose a global imperative trigger so other surfaces (e.g. an
  // AppShell footer dot) can summon the overlay without prop drilling.
  React.useEffect(() => {
    (window as any).__leafShowConsciousness = show;
    return () => {
      delete (window as any).__leafShowConsciousness;
    };
  }, [show]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Mission overlay"
      className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-md pointer-events-auto"
        onClick={close}
      />
      <div className="relative z-10 max-w-2xl mx-6 rounded-3xl border border-border bg-surface-raised shadow-2xl overflow-hidden pointer-events-auto">
        <div className="px-10 py-12 text-center">
          <LeafSprig size={36} className="text-accent mx-auto mb-6" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-subtle mb-2">
            Why we built this
          </p>
          <h2 className="font-display text-3xl text-text tracking-tight mb-3">
            We are the competition.
          </h2>
          <p className="text-sm italic text-accent/80 max-w-md mx-auto leading-relaxed mb-8">
            &ldquo;{attestation}&rdquo;
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-border/60 bg-surface px-4 py-3"
              >
                <p className="text-[11px] uppercase tracking-wider text-accent/80 font-medium mb-1">
                  {p.title}
                </p>
                <p className="text-[12px] text-text-muted leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={close}
            className="mt-8 text-[11px] text-text-subtle hover:text-text transition-colors"
          >
            Back to the work · Esc
          </button>
        </div>
      </div>
    </div>
  );
}
