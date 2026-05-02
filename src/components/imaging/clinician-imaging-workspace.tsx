"use client";

/**
 * Clinician Imaging Workspace — EMR-164
 *
 * Split-pane reading room for the patient chart. Left side: radiologist
 * report (findings / impression / recommendation). Right side: image
 * viewer (DicomViewer with annotation tools). A study switcher up top
 * flips between studies on the patient. The annotation overlay can be
 * toggled off so the provider can read the original image without
 * markup, then flipped back on to compare.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  type ImagingAnnotation,
  type ImagingStudy,
  type RadiologyReport,
} from "@/lib/domain/medical-imaging";
import { DicomViewer } from "./DicomViewer";
import { RadiologyReportPanel } from "./radiology-report-panel";

interface Props {
  patientId: string;
  authorName: string;
  studies: ImagingStudy[];
  annotationsByStudy: Record<string, ImagingAnnotation[]>;
  reportsByStudy: Record<string, RadiologyReport>;
}

export function ClinicianImagingWorkspace({
  patientId,
  authorName,
  studies,
  annotationsByStudy,
  reportsByStudy,
}: Props) {
  const [selectedId, setSelectedId] = React.useState<string | null>(
    studies[0]?.id ?? null,
  );
  const [overlayOn, setOverlayOn] = React.useState(true);
  const [annotations, setAnnotations] = React.useState(annotationsByStudy);

  const study = studies.find((s) => s.id === selectedId) ?? null;
  const studyAnnotations = selectedId ? annotations[selectedId] ?? [] : [];
  const studyReport = selectedId ? reportsByStudy[selectedId] ?? null : null;

  const handleSave = React.useCallback(
    async (
      input: Omit<ImagingAnnotation, "id" | "createdAt" | "studyId">,
    ) => {
      if (!selectedId) return;
      try {
        const res = await fetch(
          `/api/imaging/studies/${selectedId}/annotations`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { annotation: ImagingAnnotation };
        setAnnotations((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] ?? []), data.annotation],
        }));
      } catch {
        // Network failures are intentionally swallowed; the in-memory
        // store on the server is dev-only and the worst case is the
        // marker fails to persist.
      }
    },
    [selectedId],
  );

  const handleDelete = React.useCallback(
    async (annotationId: string) => {
      if (!selectedId) return;
      try {
        await fetch(
          `/api/imaging/studies/${selectedId}/annotations?annotationId=${annotationId}`,
          { method: "DELETE" },
        );
        setAnnotations((prev) => ({
          ...prev,
          [selectedId]: (prev[selectedId] ?? []).filter(
            (a) => a.id !== annotationId,
          ),
        }));
      } catch {
        /* noop */
      }
    },
    [selectedId],
  );

  if (studies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-text-muted">
        <p className="text-sm font-medium text-text mb-1">
          No imaging studies on file for this patient.
        </p>
        <p className="text-sm">
          Upload a CT, MRI, or X-ray from the documents tab to start a read.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Study switcher + overlay toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold">
            Studies
          </span>
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
            {studies.map((s) => {
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={active}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-ink shadow-sm"
                      : "text-text-muted hover:text-text",
                  )}
                  title={`${s.description} · ${s.studyDate}`}
                >
                  {s.modality} · {s.studyDate}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={overlayOn}
            onChange={(e) => setOverlayOn(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Annotation overlay
        </label>
      </div>

      {/* Split: report left, viewer right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 lg:sticky lg:top-4 lg:self-start">
          {study && (
            <RadiologyReportPanel
              study={study}
              report={studyReport}
              audience="provider"
            />
          )}
        </div>
        <div className="lg:col-span-7">
          {study && (
            <>
              <DicomViewer
                study={study}
                annotations={studyAnnotations}
                showAnnotations={overlayOn}
                authorName={authorName}
                onAnnotationSave={handleSave}
                onAnnotationDelete={handleDelete}
              />
              <p className="text-[11px] text-text-subtle mt-2 px-1">
                Drag on the image to set Window/Level. Use ↗, 📏, or T to
                annotate. Markers post to{" "}
                <code className="font-mono">
                  /api/imaging/studies/{study.id}/annotations
                </code>
                .
              </p>
            </>
          )}
        </div>
      </div>

      {/* Keyed off patientId for tracking; used by parent if it wants to
          route deep-links into this view via `?study=`. Hidden — exposes
          no UX. */}
      <input type="hidden" data-patient-id={patientId} />
    </div>
  );
}
