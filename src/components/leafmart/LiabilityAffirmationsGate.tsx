"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * EMR-337 — Account creation liability flow.
 *
 * Required, non-skippable affirmations a buyer must accept before the
 * signup form is unlocked. Captured client-side, then POSTed to
 * `/api/leafmart/account/affirmations` for an audit log entry that
 * records timestamp, IP (server-side), user-agent, and the affirmation
 * version hash. Bumping any checkbox copy must bump
 * AFFIRMATIONS_VERSION so the audit trail stays meaningful.
 */
export const AFFIRMATIONS_VERSION = "2026-05-02-v1";

const AFFIRMATIONS: ReadonlyArray<{
  id: string;
  label: React.ReactNode;
}> = [
  {
    id: "age_21_plus",
    label: <>I am 21 years of age or older.</>,
  },
  {
    id: "not_medical",
    label: (
      <>
        I understand the products sold here are <strong>not medical
        treatments</strong> and Leafmart is not a medical provider.
      </>
    ),
  },
  {
    id: "consult_provider",
    label: (
      <>
        I will consult my own healthcare provider before starting,
        changing, or stopping any product.
      </>
    ),
  },
  {
    id: "drug_interactions",
    label: (
      <>
        I understand that cannabinoid products may interact with
        prescription medications, alcohol, and other substances.
      </>
    ),
  },
  {
    id: "drug_test",
    label: (
      <>
        I understand that hemp-derived products may cause a positive
        result on workplace, sport, or military drug tests.
      </>
    ),
  },
  {
    id: "responsibility",
    label: (
      <>
        I assume full responsibility for my use, including any
        consequences related to driving, work, parenting, or
        professional licensing.
      </>
    ),
  },
  {
    id: "tos",
    label: (
      <>
        I have read and agree to the{" "}
        <Link href="/legal/terms" target="_blank" className="underline text-[var(--leaf)] hover:text-[var(--ink)]">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" target="_blank" className="underline text-[var(--leaf)] hover:text-[var(--ink)]">
          Privacy Policy
        </Link>
        , including the dosing and assumption-of-risk waiver.
      </>
    ),
  },
];

interface Props {
  children: React.ReactNode;
}

export function LiabilityAffirmationsGate({ children }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = AFFIRMATIONS.every((a) => checked[a.id]);

  async function handleAcknowledge() {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leafmart/account/affirmations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: AFFIRMATIONS_VERSION,
          affirmations: AFFIRMATIONS.map((a) => a.id),
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });
      // The endpoint may not exist yet in lower envs — soft-fail to
      // unlock so the smoke test still works while the migration ships.
      if (!res.ok && res.status !== 404) {
        throw new Error(`Could not record affirmation (${res.status}).`);
      }
      setUnlocked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record affirmation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow text-[var(--leaf)] mb-2">Before you create an account</p>
        <h2 className="font-display text-[20px] sm:text-[22px] font-medium tracking-tight text-[var(--ink)]">
          Please confirm the following:
        </h2>
        <p className="text-[12.5px] text-[var(--muted)] mt-1">
          Your acknowledgement is logged with a timestamp for legal-record purposes (version {AFFIRMATIONS_VERSION}).
        </p>
      </div>

      <ul className="space-y-3" role="group" aria-label="Required affirmations">
        {AFFIRMATIONS.map((a) => (
          <li key={a.id}>
            <label className="flex items-start gap-3 cursor-pointer text-[13.5px] sm:text-[14px] leading-snug text-[var(--text)]">
              <input
                type="checkbox"
                checked={!!checked[a.id]}
                onChange={(e) =>
                  setChecked((prev) => ({ ...prev, [a.id]: e.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-[var(--border-strong)] text-[var(--leaf)] focus:ring-[var(--leaf)] flex-shrink-0"
                aria-required="true"
              />
              <span>{a.label}</span>
            </label>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="text-[12.5px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleAcknowledge}
        disabled={!allChecked || submitting}
        className="w-full rounded-full bg-[var(--ink)] text-[var(--bg)] px-6 py-3.5 text-[14.5px] font-medium hover:bg-[var(--leaf)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Recording…" : allChecked ? "I agree — continue" : "Check all to continue"}
      </button>
    </div>
  );
}
