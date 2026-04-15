"use client";

import { Button } from "@/components/ui/button";

/**
 * Medication Wallet Card — EMR-112
 *
 * A compact, printable card showing the patient's current medications
 * and cannabis regimen. Designed to fit on a wallet-sized card when
 * printed. Uses window.print() for browser-native printing.
 */

interface WalletCardProps {
  patientName: string;
  dateOfBirth: string | null;
  allergies: string[];
  medications: Array<{ name: string; dosage?: string | null }>;
  cannabisRegimens: Array<{
    productName: string;
    dose: string;
    frequency: string;
  }>;
}

export function MedicationWalletCard({
  patientName,
  dateOfBirth,
  allergies,
  medications,
  cannabisRegimens,
}: WalletCardProps) {
  return (
    <div className="mt-6">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => window.print()}
      >
        Print wallet card
      </Button>

      {/* Printable card — hidden on screen, visible when printing */}
      <div className="hidden print:block print:mt-0 print:p-0">
        <div className="border-2 border-black p-4 max-w-[3.5in] text-[9px] leading-tight font-mono">
          <div className="text-center border-b border-black pb-1 mb-2">
            <p className="font-bold text-[11px]">LEAFJOURNEY HEALTH</p>
            <p>Medication Card</p>
          </div>

          <p className="font-bold">{patientName}</p>
          {dateOfBirth && <p>DOB: {dateOfBirth}</p>}

          {allergies.length > 0 && (
            <div className="mt-2 border border-black px-1 py-0.5 bg-gray-100">
              <p className="font-bold">ALLERGIES:</p>
              <p>{allergies.join(", ")}</p>
            </div>
          )}

          {medications.length > 0 && (
            <div className="mt-2">
              <p className="font-bold underline">Medications:</p>
              {medications.map((m, i) => (
                <p key={i}>
                  {m.name}
                  {m.dosage ? ` — ${m.dosage}` : ""}
                </p>
              ))}
            </div>
          )}

          {cannabisRegimens.length > 0 && (
            <div className="mt-2">
              <p className="font-bold underline">Cannabis Regimen:</p>
              {cannabisRegimens.map((r, i) => (
                <p key={i}>
                  {r.productName}: {r.dose}, {r.frequency}
                </p>
              ))}
            </div>
          )}

          <div className="mt-3 pt-1 border-t border-black text-center">
            <p>leafjourney.com</p>
          </div>
        </div>
      </div>

      {/* On-screen preview */}
      <div className="mt-4 print:hidden border-2 border-border rounded-xl p-5 max-w-sm bg-surface">
        <div className="text-center border-b border-border pb-2 mb-3">
          <p className="font-display text-sm font-medium text-text">
            Leafjourney Health
          </p>
          <p className="text-[10px] text-text-subtle">Medication Card</p>
        </div>

        <p className="text-sm font-medium text-text">{patientName}</p>
        {dateOfBirth && (
          <p className="text-xs text-text-muted">DOB: {dateOfBirth}</p>
        )}

        {allergies.length > 0 && (
          <div className="mt-3 rounded-md bg-danger/10 border border-danger/30 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold text-danger uppercase tracking-wider">
              Allergies
            </p>
            <p className="text-xs text-danger">{allergies.join(", ")}</p>
          </div>
        )}

        {medications.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-medium text-text-subtle uppercase tracking-wider mb-1">
              Medications
            </p>
            {medications.map((m, i) => (
              <p key={i} className="text-xs text-text">
                {m.name}
                {m.dosage ? (
                  <span className="text-text-muted"> — {m.dosage}</span>
                ) : null}
              </p>
            ))}
          </div>
        )}

        {cannabisRegimens.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-medium text-text-subtle uppercase tracking-wider mb-1">
              Cannabis Regimen
            </p>
            {cannabisRegimens.map((r, i) => (
              <p key={i} className="text-xs text-text">
                {r.productName}:{" "}
                <span className="text-text-muted">
                  {r.dose}, {r.frequency}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
