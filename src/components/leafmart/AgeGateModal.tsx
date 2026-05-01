"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  confirmAgeOver21,
  denyAgeOver21,
  useAgeConfirmation,
} from "@/lib/leafmart/age-confirmation";

export type AgeGateModalProps = {
  open: boolean;
  /** Called when the user dismisses without making a choice (Escape, backdrop). */
  onClose: () => void;
  /** Called after the user confirms 21+. The parent typically continues the
   *  purchase flow (navigate to /checkout, etc.). */
  onConfirmed?: () => void;
  /** Optional: where the polite "browse other products" CTA navigates to in
   *  the blocked state. Defaults to `/leafmart`. */
  browseHref?: string;
};

/**
 * Reusable, accessible 21+ age confirmation. Liquid-glass panel with a
 * frosted backdrop, an inner highlight, and the brand's quiet luxury tone.
 *
 * Two states:
 *  - `prompt` — the user picks "I am 21 or older" or "I am not 21".
 *  - `blocked` — shown after a "not 21" answer; offers a polite exit.
 */
export function AgeGateModal({
  open,
  onClose,
  onConfirmed,
  browseHref = "/leafmart",
}: AgeGateModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const { status } = useAgeConfirmation();
  const [stage, setStage] = useState<"prompt" | "blocked">("prompt");

  // When the modal re-opens, sync stage with the persisted denial state so
  // a previously-denied user lands directly in the polite blocked view.
  useEffect(() => {
    if (open) {
      setStage(status === "denied" ? "blocked" : "prompt");
    }
  }, [open, status]);

  // Escape, focus management, and body-scroll lock — same primitives the
  // existing CartDrawer uses, just tuned for a centered dialog.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    // Move focus into the dialog after the enter transition.
    const focusTimer = window.setTimeout(() => {
      primaryRef.current?.focus();
    }, 80);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, stage]);

  const handleConfirm = useCallback(() => {
    confirmAgeOver21();
    onConfirmed?.();
    onClose();
  }, [onConfirmed, onClose]);

  const handleDeny = useCallback(() => {
    denyAgeOver21();
    setStage("blocked");
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 sm:py-12"
    >
      {/* Frosted backdrop — keeps the storefront softly visible behind. */}
      <button
        type="button"
        aria-label="Dismiss age confirmation"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 bg-[var(--ink)]/35 backdrop-blur-md cursor-default animate-in fade-in duration-300"
      />

      {/* Liquid-glass panel */}
      <div
        ref={dialogRef}
        className={[
          "relative w-full max-w-md mx-auto",
          "rounded-3xl overflow-hidden",
          "bg-[var(--surface)]/80 supports-[backdrop-filter]:bg-[var(--surface)]/65",
          "backdrop-blur-2xl backdrop-saturate-150",
          "border border-white/40",
          "shadow-[0_20px_60px_-20px_rgba(21,33,25,0.45),0_0_0_1px_rgba(31,77,55,0.06)]",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-400",
        ].join(" ")}
      >
        {/* Inner highlight + soft brand wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 38%), radial-gradient(120% 80% at 50% -10%, rgba(31,77,55,0.10) 0%, rgba(31,77,55,0) 60%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-px left-6 right-6 h-px"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)",
          }}
        />

        <div className="relative p-7 sm:p-9">
          {stage === "prompt" ? (
            <PromptView
              titleId={titleId}
              descId={descId}
              primaryRef={primaryRef}
              onConfirm={handleConfirm}
              onDeny={handleDeny}
            />
          ) : (
            <BlockedView
              titleId={titleId}
              descId={descId}
              primaryRef={primaryRef}
              browseHref={browseHref}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PromptView({
  titleId,
  descId,
  primaryRef,
  onConfirm,
  onDeny,
}: {
  titleId: string;
  descId: string;
  primaryRef: React.RefObject<HTMLButtonElement>;
  onConfirm: () => void;
  onDeny: () => void;
}) {
  return (
    <>
      <div className="flex justify-center mb-5">
        <AgePill />
      </div>
      <h2
        id={titleId}
        className="font-display text-[26px] sm:text-[28px] leading-tight tracking-tight text-[var(--ink)] text-center"
      >
        Age confirmation required
      </h2>
      <p
        id={descId}
        className="mt-3 text-[14.5px] leading-relaxed text-[var(--muted)] text-center max-w-[28ch] mx-auto"
      >
        To purchase select products on The Leafmart, you must be 21 years of
        age or older. By continuing, you confirm that you meet this requirement
        and agree to use these products responsibly.
      </p>

      <div className="mt-7 flex flex-col gap-2.5">
        <button
          ref={primaryRef}
          type="button"
          onClick={onConfirm}
          className="w-full rounded-full bg-[var(--ink)] text-[var(--bg)] py-3.5 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          I am 21 or older
        </button>
        <button
          type="button"
          onClick={onDeny}
          className="w-full rounded-full border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--ink)] py-3.5 text-[14px] font-medium tracking-wide hover:bg-[var(--surface-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          I am not 21
        </button>
      </div>

      <p className="mt-5 text-center text-[11.5px] leading-relaxed text-[var(--muted)]/85">
        Please follow all applicable laws in your state or jurisdiction.
      </p>
    </>
  );
}

function BlockedView({
  titleId,
  descId,
  primaryRef,
  browseHref,
  onClose,
}: {
  titleId: string;
  descId: string;
  primaryRef: React.RefObject<HTMLButtonElement>;
  browseHref: string;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex justify-center mb-5">
        <AgePill muted />
      </div>
      <h2
        id={titleId}
        className="font-display text-[26px] sm:text-[28px] leading-tight tracking-tight text-[var(--ink)] text-center"
      >
        Thanks for your honesty
      </h2>
      <p
        id={descId}
        className="mt-3 text-[14.5px] leading-relaxed text-[var(--muted)] text-center max-w-[30ch] mx-auto"
      >
        These products are only available to customers who are 21 or older.
        We&rsquo;d love to help you explore everything else The Leafmart has to
        offer.
      </p>

      <div className="mt-7 flex flex-col gap-2.5">
        <Link
          ref={primaryRef as unknown as React.RefObject<HTMLAnchorElement>}
          href={browseHref}
          onClick={onClose}
          className="w-full block text-center rounded-full bg-[var(--ink)] text-[var(--bg)] py-3.5 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          Browse other products
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--ink)] py-3.5 text-[14px] font-medium tracking-wide hover:bg-[var(--surface-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          Close
        </button>
      </div>
    </>
  );
}

/** Small refined "21+" mark — a frosted shield-like badge in the brand palette. */
function AgePill({ muted = false }: { muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        "relative inline-flex items-center justify-center",
        "h-12 px-5 rounded-full",
        "bg-[var(--surface-muted)]/70 supports-[backdrop-filter]:bg-white/55",
        "backdrop-blur-md",
        "border border-white/60",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_-12px_rgba(31,77,55,0.45)]",
      ].join(" ")}
    >
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 50%)",
        }}
      />
      <span
        className={[
          "relative font-display text-[16px] tracking-[0.04em]",
          muted ? "text-[var(--muted)]" : "text-[var(--leaf)]",
        ].join(" ")}
      >
        <span className="font-medium">21</span>
        <span className="ml-0.5 align-top text-[12px]">+</span>
      </span>
    </span>
  );
}
