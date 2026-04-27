"use client";

import { cn } from "@/lib/utils/cn";

/**
 * EMR-060 — Minimum Clicks Pass.
 * Vitals strip surfaced at the very top of the patient chart so the
 * clinician sees BP/HR/Temp/RR/SpO2/Weight at zero clicks (was buried
 * 3 clicks deep behind labs/notes tabs).
 *
 * Reads from intakeAnswers JSON; falls back to em-dash placeholders
 * when a vital isn't on file. Renders "Last recorded" relative date
 * if present.
 */

type Vital = { label: string; value: string; unit?: string; warn?: boolean };

interface VitalsRaw {
  bloodPressure?: string;
  heartRate?: number | string;
  temperature?: number | string;
  respiratoryRate?: number | string;
  spo2?: number | string;
  weight?: number | string;
  height?: number | string;
  recordedAt?: string;
}

function readVitals(intakeAnswers: unknown): VitalsRaw {
  if (!intakeAnswers || typeof intakeAnswers !== "object") return {};
  const a = intakeAnswers as Record<string, unknown>;
  const v = (a.vitals && typeof a.vitals === "object" ? a.vitals : a) as Record<
    string,
    unknown
  >;
  return {
    bloodPressure: typeof v.bloodPressure === "string"
      ? v.bloodPressure
      : typeof v.bp === "string"
        ? v.bp
        : undefined,
    heartRate: (v.heartRate as string | number) ?? (v.hr as string | number),
    temperature: (v.temperature as string | number) ?? (v.temp as string | number),
    respiratoryRate:
      (v.respiratoryRate as string | number) ?? (v.rr as string | number),
    spo2: (v.spo2 as string | number) ?? (v.oxygen as string | number),
    weight: (v.weight as string | number) ?? (v.weightLbs as string | number),
    height: (v.height as string | number) ?? (v.heightIn as string | number),
    recordedAt:
      typeof v.recordedAt === "string"
        ? v.recordedAt
        : typeof v.vitalsRecordedAt === "string"
          ? v.vitalsRecordedAt
          : undefined,
  };
}

function pill(value: string | number | undefined, unit?: string): string {
  if (value === undefined || value === null || value === "") return "—";
  return unit ? `${value} ${unit}` : String(value);
}

export function VitalsSnapshot({
  intakeAnswers,
  className,
}: {
  intakeAnswers: unknown;
  className?: string;
}) {
  const v = readVitals(intakeAnswers);

  const tiles: Vital[] = [
    { label: "BP", value: v.bloodPressure ?? "—", unit: "mmHg" },
    { label: "HR", value: pill(v.heartRate), unit: "bpm" },
    { label: "Temp", value: pill(v.temperature), unit: "°F" },
    { label: "RR", value: pill(v.respiratoryRate), unit: "/min" },
    { label: "SpO₂", value: pill(v.spo2), unit: "%" },
    { label: "Wt", value: pill(v.weight), unit: "lb" },
    { label: "Ht", value: pill(v.height), unit: "in" },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-surface px-3 py-2 shadow-sm",
        className,
      )}
      aria-label="Vitals snapshot"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
          Vitals
        </span>
        <span className="text-[10px] text-text-subtle">
          {v.recordedAt
            ? `Last recorded ${new Date(v.recordedAt).toLocaleDateString()}`
            : "Not on file"}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={cn(
              "rounded-md border border-border/60 bg-surface-muted/40 px-2 py-1 text-center min-w-0",
              t.warn && "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/[0.06]",
            )}
          >
            <p className="text-[10px] font-medium text-text-subtle">
              {t.label}
            </p>
            <p className="text-xs font-semibold text-text tabular-nums truncate">
              {t.value === "—" ? (
                <span className="text-text-subtle font-normal">—</span>
              ) : (
                <>
                  {t.value}
                  {t.unit && t.value !== "—" && (
                    <span className="text-[9px] text-text-subtle font-normal ml-0.5">
                      {t.unit}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
