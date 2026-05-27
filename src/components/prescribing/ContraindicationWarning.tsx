"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  validateOverride,
  buildOverrideAudit,
  type ContraindicationCheckResult,
  type OverrideAttempt,
  type ContraindicationOverrideAudit,
} from "@/lib/clinical/contraindication-check";

/**
 * EMR-088 — Modal warning shown at prescribing time when a patient
 * matches one or more cannabis contraindications.
 *
 * Behavior:
 *  - "block" gate (absolute): submit button disabled until override
 *    form is filled out completely AND the reasoning references the
 *    matched flag by keyword (enforced by `validateOverride`).
 *  - "warn" gate (relative): override form required but copy is softer.
 *  - "inform" gate (caution): single acknowledge button is enough.
 *  - "clear" gate: nothing renders.
 *
 * The component is purely presentational + form state; the host page
 * passes `onOverride` which receives the audit-ready payload.
 */

const TONE: Record<
  Exclude<ContraindicationCheckResult["gate"], "clear">,
  { ring: string; bg: string; chip: string; title: string }
> = {
  block: {
    ring: "ring-rose-300",
    bg: "bg-rose-50",
    chip: "bg-rose-600 text-white",
    title: "text-rose-900",
  },
  warn: {
    ring: "ring-amber-300",
    bg: "bg-amber-50",
    chip: "bg-amber-600 text-white",
    title: "text-amber-900",
  },
  inform: {
    ring: "ring-sky-300",
    bg: "bg-sky-50",
    chip: "bg-sky-600 text-white",
    title: "text-sky-900",
  },
};

export interface ContraindicationWarningProps {
  check: ContraindicationCheckResult;
  /** Called with audit-ready payload after a valid override. */
  onOverride: (audit: ContraindicationOverrideAudit) => void;
  /** Called when the clinician chooses to NOT override (cancel/abort prescribe). */
  onCancel: () => void;
  /** Optional: prefill the e-signature with the signed-in clinician. */
  defaultClinicianName?: string;
}

export function ContraindicationWarning({
  check,
  onOverride,
  onCancel,
  defaultClinicianName,
}: ContraindicationWarningProps) {
  const [reason, setReason] = React.useState("");
  const [clinicianAttestation, setClinicianAttestation] = React.useState(
    defaultClinicianName ?? "",
  );
  const [patientCounseled, setPatientCounseled] = React.useState(false);
  const [alternativesConsidered, setAlternativesConsidered] =
    React.useState(false);
  const [submitAttempted, setSubmitAttempted] = React.useState(false);

  if (check.gate === "clear") return null;

  const tone = TONE[check.gate];
  const isInform = check.gate === "inform";

  const attempt: OverrideAttempt = {
    reason,
    clinicianAttestation,
    patientCounseledAcknowledged: patientCounseled,
    alternativesConsideredAcknowledged: alternativesConsidered,
  };
  const validation = isInform
    ? { ok: true, errors: [] }
    : validateOverride(attempt, check);

  function handleSubmit() {
    setSubmitAttempted(true);
    if (!validation.ok) return;
    if (isInform) {
      // Caution-tier still produces an audit row, but with a stub
      // attestation so it's distinguishable in the log.
      onOverride(
        buildOverrideAudit(
          {
            reason: "Acknowledged caution-tier flag.",
            clinicianAttestation:
              clinicianAttestation || defaultClinicianName || "acknowledged",
            patientCounseledAcknowledged: true,
            alternativesConsideredAcknowledged: true,
          },
          check,
        ),
      );
      return;
    }
    onOverride(buildOverrideAudit(attempt, check));
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ci-warning-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        className={cn(
          "w-full max-w-xl rounded-2xl ring-1 shadow-2xl",
          tone.bg,
          tone.ring,
        )}
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex h-7 px-2.5 items-center rounded-full text-[11px] font-bold uppercase tracking-wider",
                tone.chip,
              )}
            >
              {check.gate === "block"
                ? "Override required"
                : check.gate === "warn"
                  ? "Caution"
                  : "Heads up"}
            </span>
            <h2
              id="ci-warning-title"
              className={cn("text-lg font-semibold", tone.title)}
            >
              {check.headline}
            </h2>
          </div>

          <p className="mt-3 text-sm text-slate-700">
            {check.patientFacingSummary}
          </p>

          <ul className="mt-4 space-y-2">
            {check.matches.map((m) => (
              <li
                key={`${m.contraindication.id}-${m.matchedOn}`}
                className="rounded-lg border border-white/60 bg-white/80 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {m.contraindication.label}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500">
                    {m.contraindication.severity}
                  </span>
                </div>
                <p className="mt-1 text-slate-700">
                  {m.contraindication.rationale}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Matched on {m.matchedOn}
                </p>
              </li>
            ))}
          </ul>

          {!isInform && (
            <div className="mt-5 space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-800">
                  Override reasoning
                </span>
                <span className="ml-1 text-xs text-slate-500">
                  (≥ 30 characters; reference the flagged condition by name for
                  absolute contraindications)
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-500 focus:outline-none"
                  placeholder="Why is this still the right prescription for this patient? Reference the specific contraindication you are overriding."
                />
              </label>

              <div className="grid grid-cols-1 gap-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={patientCounseled}
                    onChange={(e) => setPatientCounseled(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I have discussed the risks of this prescription with the
                    patient.
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={alternativesConsidered}
                    onChange={(e) =>
                      setAlternativesConsidered(e.target.checked)
                    }
                    className="mt-0.5"
                  />
                  <span>
                    I have considered alternative therapies and documented why
                    cannabis is preferred here.
                  </span>
                </label>
              </div>

              <label className="block text-sm">
                <span className="font-medium text-slate-800">
                  Clinician attestation (e-signature)
                </span>
                <input
                  type="text"
                  value={clinicianAttestation}
                  onChange={(e) => setClinicianAttestation(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-500 focus:outline-none"
                  placeholder="Type your full name to sign"
                />
              </label>
            </div>
          )}

          {submitAttempted && validation.errors.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-md bg-rose-100 p-3 text-sm text-rose-800">
              {validation.errors.map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel prescription
            </Button>
            <Button
              variant={check.gate === "block" ? "danger" : "primary"}
              onClick={handleSubmit}
              disabled={!isInform && !validation.ok && submitAttempted}
            >
              {isInform
                ? "Acknowledge & continue"
                : check.gate === "block"
                  ? "Override absolute contraindication"
                  : "Confirm override"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
