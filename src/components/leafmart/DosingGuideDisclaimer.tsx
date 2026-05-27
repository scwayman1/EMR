"use client";

// EMR-371 — single shared dosing-guide disclaimer modal.
//
// Mounts on every dosing guide page. On first visit the modal blocks the
// page; once the user acknowledges, the consent is persisted to
// localStorage and the modal stays out of the way on subsequent visits.
//
// We deliberately do not gate by guide slug — acknowledging once covers
// every dosing guide on the site.

import { useEffect, useState } from "react";

const STORAGE_KEY = "lm.dosing-disclaimer.ack.v1";

export function DosingGuideDisclaimer() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const acked = window.localStorage.getItem(STORAGE_KEY);
      if (!acked) setOpen(true);
    } catch {
      setOpen(true);
    }
    setHydrated(true);
  }, []);

  function acknowledge() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // storage may be unavailable in private mode — accept once-per-tab.
    }
    setOpen(false);
  }

  if (!hydrated || !open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dosing-disclaimer-heading"
      className="fixed inset-0 z-50 flex items-center justify-center px-5 py-10 bg-black/50 backdrop-blur-sm"
    >
      <div className="max-w-[520px] w-full rounded-[24px] bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 sm:p-8">
        <p className="eyebrow text-[var(--leaf)] mb-2">Before you read on</p>
        <h2
          id="dosing-disclaimer-heading"
          className="font-display text-[22px] sm:text-[26px] font-normal tracking-tight text-[var(--ink)] mb-3"
        >
          A dosing guide, not a prescription
        </h2>
        <ul className="space-y-2.5 text-[14px] leading-relaxed text-[var(--text-soft)] mb-6">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--leaf)] flex-shrink-0" />
            These guides summarize evidence-informed starting ranges. They are
            educational, not medical advice.
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--leaf)] flex-shrink-0" />
            Always consult your provider before starting, stopping, or changing
            a cannabinoid regimen — especially if you take other medications or
            are pregnant.
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--leaf)] flex-shrink-0" />
            By continuing, you acknowledge you are responsible for your own
            decisions about use.
          </li>
        </ul>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={acknowledge}
            className="inline-flex items-center justify-center rounded-full bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)] transition-colors px-6 py-3 text-[14px] font-medium"
          >
            I understand — show the guide
          </button>
        </div>
      </div>
    </div>
  );
}
