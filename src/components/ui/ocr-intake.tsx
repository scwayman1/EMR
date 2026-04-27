"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * EMR-081 — OCR Intake Scaffold.
 * Simulates the experience of scanning a paper medication list:
 * drop a file, watch a scan-line sweep, then mock-extract a few
 * medications into an editable form. No real OCR happens — the
 * extraction is hardcoded so a clinician/PM can demo the workflow
 * end-to-end before we wire up Tesseract / Textract / Claude OCR.
 */

export type ExtractedMedication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  confidence: number;
  edited?: boolean;
};

type ScanState =
  | { kind: "idle" }
  | { kind: "preview"; file: File; previewUrl: string }
  | { kind: "scanning"; file: File; previewUrl: string; progress: number }
  | {
      kind: "extracted";
      file: File;
      previewUrl: string;
      meds: ExtractedMedication[];
    };

/**
 * Mock extraction — pretends to pull medications off a scanned
 * page. Stable so demos show the same data each time. Replace
 * this with a server action when real OCR lands.
 */
const MOCK_EXTRACTIONS: ExtractedMedication[] = [
  {
    id: "m1",
    name: "Metformin HCl",
    dosage: "500 mg",
    frequency: "Twice daily",
    confidence: 0.97,
  },
  {
    id: "m2",
    name: "Atorvastatin",
    dosage: "20 mg",
    frequency: "Once daily at bedtime",
    confidence: 0.94,
  },
  {
    id: "m3",
    name: "Lisinopril",
    dosage: "10 mg",
    frequency: "Once daily",
    confidence: 0.92,
  },
  {
    id: "m4",
    name: "Sertraline",
    dosage: "50 mg",
    frequency: "Once daily",
    confidence: 0.71,
  },
];

export function OcrIntake({
  onConfirm,
}: {
  onConfirm?: (meds: ExtractedMedication[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ScanState>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);

  const beginScan = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setState({ kind: "scanning", file, previewUrl, progress: 0 });

    const start = Date.now();
    const duration = 2400;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setState((prev) =>
        prev.kind === "scanning" ? { ...prev, progress } : prev,
      );
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setState({
          kind: "extracted",
          file,
          previewUrl,
          meds: MOCK_EXTRACTIONS.map((m) => ({ ...m })),
        });
      }
    };
    requestAnimationFrame(tick);
  }, []);

  const handleFile = useCallback((f: File) => {
    const url = URL.createObjectURL(f);
    setState({ kind: "preview", file: f, previewUrl: url });
  }, []);

  const reset = useCallback(() => {
    if (state.kind !== "idle" && "previewUrl" in state) {
      URL.revokeObjectURL(state.previewUrl);
    }
    if (inputRef.current) inputRef.current.value = "";
    setState({ kind: "idle" });
  }, [state]);

  const updateMed = (id: string, patch: Partial<ExtractedMedication>) => {
    setState((prev) =>
      prev.kind === "extracted"
        ? {
            ...prev,
            meds: prev.meds.map((m) =>
              m.id === id ? { ...m, ...patch, edited: true } : m,
            ),
          }
        : prev,
    );
  };

  const removeMed = (id: string) => {
    setState((prev) =>
      prev.kind === "extracted"
        ? { ...prev, meds: prev.meds.filter((m) => m.id !== id) }
        : prev,
    );
  };

  // ── Idle / drop zone ────────────────────────────────────────
  if (state.kind === "idle") {
    return (
      <div className="space-y-3">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={`block border-2 border-dashed rounded-2xl px-6 py-12 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-accent bg-accent-soft/40"
              : "border-border-strong/50 bg-surface-muted/30 hover:border-accent/50 hover:bg-accent-soft/20"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <div
              aria-hidden="true"
              className="h-12 w-12 rounded-full bg-accent-soft/60 flex items-center justify-center"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
              >
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text">
                Drop a paper medication list to scan
              </p>
              <p className="text-xs text-text-muted mt-1">
                JPG, PNG, or PDF — we&apos;ll extract medications and let you
                review before saving
              </p>
            </div>
            <Badge tone="info" className="mt-1">
              Scaffold · simulated OCR
            </Badge>
          </div>
        </label>
      </div>
    );
  }

  // ── Preview before scan ─────────────────────────────────────
  if (state.kind === "preview") {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <PreviewArt file={state.file} previewUrl={state.previewUrl} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted truncate">
            {state.file.name}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              Choose different
            </Button>
            <Button size="sm" onClick={() => beginScan(state.file)}>
              Scan &amp; extract
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Scanning animation ──────────────────────────────────────
  if (state.kind === "scanning") {
    const pct = Math.round(state.progress * 100);
    return (
      <div className="space-y-3">
        <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
          <PreviewArt file={state.file} previewUrl={state.previewUrl} />

          {/* Sweeping scan line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-accent/40 to-transparent shadow-[0_0_24px_rgba(31,77,55,0.6)] transition-[top] ease-linear"
            style={{ top: `${state.progress * 100}%` }}
          />
          {/* Subtle highlight band */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-accent/[0.02]"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent-strong transition-all duration-100"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-text-muted tabular-nums w-24 text-right">
            Scanning… {pct}%
          </p>
        </div>
      </div>
    );
  }

  // ── Extracted ─ editable form ───────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-32 shrink-0 rounded-xl border border-border bg-surface overflow-hidden">
          <PreviewArt
            file={state.file}
            previewUrl={state.previewUrl}
            compact
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">✓</span>
            <p className="text-sm font-semibold text-text">
              Extracted {state.meds.length} medication
              {state.meds.length === 1 ? "" : "s"}
            </p>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Review the extracted data, edit any low-confidence rows, and
            confirm to populate the patient&apos;s medication list.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {state.meds.map((m) => (
          <ExtractedRow
            key={m.id}
            med={m}
            onUpdate={(patch) => updateMed(m.id, patch)}
            onRemove={() => removeMed(m.id)}
          />
        ))}
        {state.meds.length === 0 && (
          <p className="text-xs text-text-subtle italic py-4 text-center">
            No medications remain — re-scan or add manually.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={reset}>
          Scan another
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm?.(state.meds)}
          disabled={state.meds.length === 0}
        >
          Confirm &amp; populate ({state.meds.length})
        </Button>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */

function PreviewArt({
  file,
  previewUrl,
  compact,
}: {
  file: File;
  previewUrl: string;
  compact?: boolean;
}) {
  const isImage = file.type.startsWith("image/");
  const heightClass = compact ? "h-32" : "h-72";

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={file.name}
        className={`w-full ${heightClass} object-cover`}
      />
    );
  }

  // Stylized "paper page" placeholder for PDFs / other formats
  return (
    <div
      className={`relative w-full ${heightClass} bg-gradient-to-b from-surface to-surface-muted/40 flex flex-col gap-2 p-6`}
    >
      <div className="h-2 rounded bg-text/10 w-2/3" />
      <div className="h-2 rounded bg-text/10 w-1/2" />
      <div className="mt-2 h-2 rounded bg-text/10 w-full" />
      <div className="h-2 rounded bg-text/10 w-5/6" />
      <div className="h-2 rounded bg-text/10 w-3/4" />
      <div className="mt-2 h-2 rounded bg-text/10 w-full" />
      <div className="h-2 rounded bg-text/10 w-2/3" />
      <p className="absolute bottom-3 right-4 text-[10px] uppercase tracking-wider text-text-subtle">
        {file.name}
      </p>
    </div>
  );
}

function ExtractedRow({
  med,
  onUpdate,
  onRemove,
}: {
  med: ExtractedMedication;
  onUpdate: (patch: Partial<ExtractedMedication>) => void;
  onRemove: () => void;
}) {
  const lowConfidence = med.confidence < 0.85;

  return (
    <div
      className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border ${
        lowConfidence
          ? "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/[0.05]"
          : "border-border bg-surface-muted/30"
      }`}
    >
      <div className="col-span-4">
        <Input
          value={med.name}
          className="h-8 text-xs px-2"
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>
      <div className="col-span-2">
        <Input
          value={med.dosage}
          className="h-8 text-xs px-2"
          onChange={(e) => onUpdate({ dosage: e.target.value })}
        />
      </div>
      <div className="col-span-3">
        <Input
          value={med.frequency}
          className="h-8 text-xs px-2"
          onChange={(e) => onUpdate({ frequency: e.target.value })}
        />
      </div>
      <div className="col-span-2 flex items-center gap-1">
        <Badge
          tone={lowConfidence ? "warning" : "success"}
          className="!text-[10px]"
        >
          {Math.round(med.confidence * 100)}%
        </Badge>
        {med.edited && (
          <span className="text-[9px] text-text-subtle italic">edited</span>
        )}
      </div>
      <div className="col-span-1 text-right">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${med.name}`}
          className="h-7 w-7 rounded-md text-text-subtle hover:bg-surface-muted hover:text-danger transition-colors inline-flex items-center justify-center"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
