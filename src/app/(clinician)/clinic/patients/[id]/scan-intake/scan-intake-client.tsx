"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OcrIntake, type ExtractedMedication } from "@/components/ui/ocr-intake";
import { Badge } from "@/components/ui/badge";

export function ScanIntakeClient({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState<ExtractedMedication[] | null>(
    null,
  );

  if (confirmed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌿</span>
          <div>
            <p className="text-base font-semibold text-text">
              {confirmed.length} medication{confirmed.length === 1 ? "" : "s"} ready
              to populate
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Wiring to the patient&apos;s medication list will land in the next
              slice — for now, this is a scaffold.
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {confirmed.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 p-2 rounded-lg border border-border bg-surface-muted/30"
            >
              <span className="text-sm font-medium text-text">{m.name}</span>
              <span className="text-xs text-text-muted">{m.dosage}</span>
              <span className="text-xs text-text-subtle">·</span>
              <span className="text-xs text-text-muted">{m.frequency}</span>
              <Badge
                tone={m.confidence < 0.85 ? "warning" : "success"}
                className="ml-auto !text-[10px]"
              >
                {Math.round(m.confidence * 100)}%
              </Badge>
              {m.edited && (
                <span className="text-[10px] text-text-subtle italic">
                  edited
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setConfirmed(null)}
            className="text-xs text-text-muted hover:text-text underline-offset-2 hover:underline"
          >
            Scan another page
          </button>
          <button
            type="button"
            onClick={() => router.push(`/clinic/patients/${patientId}`)}
            className="text-xs text-accent hover:text-accent-strong underline-offset-2 hover:underline"
          >
            Back to chart
          </button>
        </div>
      </div>
    );
  }

  return <OcrIntake onConfirm={setConfirmed} />;
}
