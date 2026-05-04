"use client";

// EMR-280 — Vendor-site link with a leaving-site disclaimer modal.
//
// Renders a button under "About this product". Clicking opens a modal
// that warns the patient they're leaving Leafmart, recaps that the
// vendor's site is independent and that any purchase or claim there
// is between the patient and the vendor. Confirmation opens the link
// in a new tab with `noopener`.

import { useState, useCallback } from "react";

interface Props {
  vendorName: string;
  vendorUrl: string;
  className?: string;
}

export function VendorSiteLink({ vendorName, vendorUrl, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const proceed = useCallback(() => {
    window.open(vendorUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  }, [vendorUrl]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-medium text-[var(--ink)] hover:border-[var(--leaf)] hover:text-[var(--leaf)] transition-colors ${className}`}
      >
        Visit {vendorName} <span aria-hidden="true">↗</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="You are leaving Leafmart"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={close}
        >
          <div
            className="bg-[var(--surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow text-[var(--leaf)] mb-2">Heads up</p>
            <h3 className="font-display text-[22px] text-[var(--ink)] mb-3 leading-tight">
              You're leaving Leafmart.
            </h3>
            <p className="text-[14px] text-[var(--text-soft)] leading-relaxed mb-4">
              {vendorName} is an independent vendor. Their site, claims,
              pricing, returns, privacy practices, and any purchase you make
              there are between you and {vendorName}. Leafmart can't verify or
              vouch for content outside our store.
            </p>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-5">
              Cannabis laws vary by state. Confirm with your provider before
              acting on anything you read on a vendor site.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)]"
              >
                Stay on Leafmart
              </button>
              <button
                type="button"
                onClick={proceed}
                className="rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)] transition-colors"
              >
                Continue to {vendorName}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
