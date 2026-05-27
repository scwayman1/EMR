"use client";

/**
 * Provider Imaging Workbench — combines:
 *   • Study list (left)
 *   • DICOM viewer with annotation tools (center)
 *   • Radiology report panel + image/report toggle (right)
 *   • Upload backend (modal)
 *
 * Self-contained: this component is the entry point used by the isolated
 * /clinic/imaging-lab route. It owns the client-side fetches against
 * /api/imaging/* so the page-level server component stays thin and the
 * Track 7 Clinician Shell never has to import anything from this track.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  type ImagingAnnotation,
  type ImagingStudy,
  type RadiologyReport,
  type UploadResult,
} from "@/lib/domain/medical-imaging";
import { DicomViewerPro } from "./dicom-viewer-pro";
import { RadiologyReportPanel } from "./radiology-report-panel";
import { StudyList } from "./study-list";
import { ImagingUploadDropzone } from "./imaging-upload-dropzone";

interface Props {
  initialStudies: ImagingStudy[];
  /** Map keyed by studyId. Optional — defaults fetched from API on demand. */
  initialAnnotations?: Record<string, ImagingAnnotation[]>;
  initialReports?: Record<string, RadiologyReport>;
  defaultPatientId: string;
  authorName?: string;
}

type ViewMode = "image" | "report" | "split";

export function ImagingLabWorkbench({
  initialStudies,
  initialAnnotations = {},
  initialReports = {},
  defaultPatientId,
  authorName = "Provider",
}: Props) {
  const [studies, setStudies] = React.useState(initialStudies);
  const [annotations, setAnnotations] = React.useState(initialAnnotations);
  const [reports, setReports] = React.useState(initialReports);
  const [selectedId, setSelectedId] = React.useState(
    initialStudies[0]?.id ?? null,
  );
  const [viewMode, setViewMode] = React.useState<ViewMode>("split");
  const [showUpload, setShowUpload] = React.useState(false);

  const selectedStudy = studies.find((s) => s.id === selectedId) ?? null;
  const studyAnnotations = selectedId ? annotations[selectedId] ?? [] : [];
  const studyReport = selectedId ? reports[selectedId] ?? null : null;

  // Lazy-load annotations + report whenever the selection changes and we
  // don't already have them in state.
  React.useEffect(() => {
    if (!selectedId) return;
    if (annotations[selectedId] && reports[selectedId] !== undefined) return;
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`/api/imaging/studies/${selectedId}`);
        if (!res.ok || abort) return;
        const json = (await res.json()) as {
          study: ImagingStudy;
          annotations: ImagingAnnotation[];
          report: RadiologyReport | null;
        };
        if (abort) return;
        setAnnotations((prev) => ({
          ...prev,
          [selectedId]: json.annotations,
        }));
        setReports((prev) => ({
          ...prev,
          [selectedId]: json.report as RadiologyReport,
        }));
      } catch {
        // Demo fallback: leave whatever we already have.
      }
    })();
    return () => {
      abort = true;
    };
  }, [selectedId, annotations, reports]);

  async function createAnnotation(
    payload: Omit<ImagingAnnotation, "id" | "createdAt" | "studyId">,
  ) {
    if (!selectedId) return;
    try {
      const res = await fetch(
        `/api/imaging/studies/${selectedId}/annotations`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { annotation: ImagingAnnotation };
      setAnnotations((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), json.annotation],
      }));
    } catch {
      // ignore — annotation drop is a best-effort demo
    }
  }

  async function deleteAnnotation(id: string) {
    if (!selectedId) return;
    setAnnotations((prev) => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).filter((a) => a.id !== id),
    }));
    try {
      await fetch(
        `/api/imaging/studies/${selectedId}/annotations?annotationId=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
    } catch {
      // ignore
    }
  }

  function handleUploaded(study: ImagingStudy, _result: UploadResult) {
    setStudies((prev) => [study, ...prev.filter((s) => s.id !== study.id)]);
    setSelectedId(study.id);
    setShowUpload(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface p-1">
          <ToggleChip
            active={viewMode === "image"}
            onClick={() => setViewMode("image")}
          >
            Images
          </ToggleChip>
          <ToggleChip
            active={viewMode === "split"}
            onClick={() => setViewMode("split")}
          >
            Split
          </ToggleChip>
          <ToggleChip
            active={viewMode === "report"}
            onClick={() => setViewMode("report")}
          >
            Report
          </ToggleChip>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className={cn(
            "h-9 px-3.5 rounded-md text-sm font-medium",
            showUpload
              ? "bg-surface-muted text-text"
              : "bg-accent text-accent-ink hover:bg-accent-strong",
          )}
        >
          {showUpload ? "Close uploader" : "+ Upload study"}
        </button>
      </div>

      {showUpload && (
        <ImagingUploadDropzone
          patientId={defaultPatientId}
          onUploaded={handleUploaded}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-3">
          <h2 className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold mb-2">
            Studies on file
          </h2>
          <StudyList
            studies={studies}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        <section
          className={cn(
            "lg:col-span-9 grid gap-5",
            viewMode === "split" && "lg:grid-cols-2",
            viewMode !== "split" && "grid-cols-1",
          )}
        >
          {selectedStudy ? (
            <>
              {(viewMode === "image" || viewMode === "split") && (
                <DicomViewerPro
                  study={selectedStudy}
                  annotations={studyAnnotations}
                  authorName={authorName}
                  onAnnotationCreate={createAnnotation}
                  onAnnotationDelete={deleteAnnotation}
                />
              )}
              {(viewMode === "report" || viewMode === "split") && (
                <RadiologyReportPanel
                  study={selectedStudy}
                  report={studyReport}
                  audience="provider"
                />
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-text-muted">
              Select a study to begin reading.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 px-3 rounded-full text-xs font-medium transition-colors",
        active
          ? "bg-accent text-accent-ink shadow-sm"
          : "text-text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
