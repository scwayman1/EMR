"use client";

// EMR-280 — vendor contact surface on the PDP.
//
// Three actions:
//   1. "Visit vendor site" — opens a leaving-site disclaimer modal first.
//      The link only fires after the user acknowledges the disclaimer.
//   2. "Call vendor" — tel: link, no interstitial.
//   3. "Email vendor" — mailto: link, no interstitial.
//
// We intentionally do NOT provide an in-platform messaging route between
// patient and vendor — per Dr. Patel, all communication leaves our site.

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Phone, Mail } from "lucide-react";

interface Props {
  partnerName: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  className?: string;
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function VendorContactCard({
  partnerName,
  website,
  phone,
  email,
  className,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // No contact channels → render nothing rather than an empty card.
  if (!website && !phone && !email) return null;

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Focus the dialog so screen readers announce it on open.
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const handleConfirmLeave = () => {
    if (!website) return;
    setModalOpen(false);
    // Open after state flush so the modal closes cleanly first.
    window.open(website, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`rounded-2xl bg-[var(--surface,#fff)] border border-[var(--border)] p-5 sm:p-6 ${className ?? ""}`}
      aria-labelledby="vendor-contact-title"
    >
      <p id="vendor-contact-title" className="eyebrow text-[var(--leaf)] mb-3">
        Contact {partnerName}
      </p>
      <p className="text-[13.5px] text-[var(--text-soft,inherit)] mb-4 leading-relaxed">
        Questions about ingredients, sourcing, or returns? Reach the vendor
        directly. We don&apos;t pass messages through this site.
      </p>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
        {website && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface,#fff)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--ink)] hover:border-[var(--leaf)] hover:text-[var(--leaf)] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            Visit vendor site
            <span className="text-[var(--muted)] hidden sm:inline">
              ({safeHostname(website)})
            </span>
          </button>
        )}
        {phone && (
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface,#fff)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--ink)] hover:border-[var(--leaf)] hover:text-[var(--leaf)] transition-colors"
          >
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            Call {formatPhoneDisplay(phone)}
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface,#fff)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--ink)] hover:border-[var(--leaf)] hover:text-[var(--leaf)] transition-colors"
          >
            <Mail className="w-3.5 h-3.5" aria-hidden="true" />
            Email vendor
          </a>
        )}
      </div>

      {modalOpen && website && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaving-site-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--border)] outline-none"
          >
            <div className="p-6">
              <h2 id="leaving-site-title" className="font-display text-xl text-[var(--ink)] mb-3">
                You&apos;re leaving Leafmart
              </h2>
              <p className="text-[14px] text-[var(--text-soft,inherit)] leading-relaxed mb-3">
                You&apos;re about to visit <strong>{safeHostname(website)}</strong>, a third-party
                site operated by {partnerName}. We don&apos;t control their content, privacy
                practices, pricing, or fulfillment.
              </p>
              <p className="text-[14px] text-[var(--text-soft,inherit)] leading-relaxed mb-3">
                Any product information, claims, or transactions on the vendor site are
                between you and {partnerName} — they are not endorsed, verified, or
                guaranteed by Leafjourney.
              </p>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                Always consult your healthcare provider before changing your cannabis
                regimen based on information from a third-party site.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 pb-5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full px-4 py-2 text-[13.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                Stay on Leafmart
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] text-[var(--bg,#fff)] px-5 py-2 text-[13.5px] font-medium hover:bg-[var(--leaf)] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                Continue to vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorContactCard;
