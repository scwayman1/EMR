"use client";

/**
 * Patient Imaging Gallery — EMR-141
 *
 * Patient-facing gallery for the My Imaging page. Wraps the read-only
 * DicomViewer with:
 *   • Study date + modality filters across the top
 *   • Side rail of studies (filtered) with the toggle to flip to the
 *     plain-language report
 *   • A "Download original" action that generates a manifest blob the
 *     patient can save (bytes are not exposed directly — Supabase signed
 *     URLs would be wired in here for real DICOM payloads)
 *
 * Annotations are rendered read-only: the parent already strips
 * non-released annotations server-side via `listAnnotations({ patientVisibleOnly })`.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  MODALITY_LABEL,
  type ImagingAnnotation,
  type ImagingStudy,
  type Modality,
  type RadiologyReport,
} from "@/lib/domain/medical-imaging";
import { DicomViewer } from "./DicomViewer";
import { RadiologyReportPanel } from "./radiology-report-panel";
import { StudyList } from "./study-list";

interface Props {
  studies: ImagingStudy[];
  /** Patient-visible annotations only, keyed by studyId. */
  annotations: Record<string, ImagingAnnotation[]>;
  /** Released reports only, keyed by studyId. */
  reports: Record<string, RadiologyReport>;
}

type Toggle = "image" | "report";
type DateRange = "all" | "12m" | "24m";

export function PatientImagingGallery({
  studies,
  annotations,
  reports,
}: Props) {
  const [modalityFilter, setModalityFilter] = React.useState<Modality | "all">(
    "all",
  );
  const [dateRange, setDateRange] = React.useState<DateRange>("all");
  const [view, setView] = React.useState<Toggle>("image");

  const filtered = React.useMemo(() => {
    const cutoff = computeCutoff(dateRange);
    return studies.filter((s) => {
      if (modalityFilter !== "all" && s.modality !== modalityFilter) return false;
      if (cutoff && s.studyDate < cutoff) return false;
      return true;
    });
  }, [studies, modalityFilter, dateRange]);

  const [selectedId, setSelectedId] = React.useState<string | null>(
    studies[0]?.id ?? null,
  );

  // Keep the selection valid as filters change.
  React.useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((s) => s.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const study = filtered.find((s) => s.id === selectedId) ?? null;
  const studyAnnotations = selectedId ? annotations[selectedId] ?? [] : [];
  const studyReport = selectedId ? reports[selectedId] ?? null : null;

  if (studies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-text-muted">
        <p className="text-sm font-medium text-text mb-1">
          No imaging on file yet.
        </p>
        <p className="text-sm">
          When your provider orders imaging, the report and pictures will show up here.
        </p>
      </div>
    );
  }

  const availableModalities = uniqueModalities(studies);

  return (
    <div className="space-y-5">
      <Filters
        modality={modalityFilter}
        onModality={setModalityFilter}
        modalitiesAvailable={availableModalities}
        dateRange={dateRange}
        onDateRange={setDateRange}
        resultCount={filtered.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-3">
          <h2 className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold mb-2">
            Your imaging ({filtered.length})
          </h2>
          {filtered.length > 0 ? (
            <StudyList
              studies={filtered}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setView("image");
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-text-muted">
              No studies match these filters.
            </div>
          )}
        </aside>

        <section className="lg:col-span-9 space-y-4">
          {study ? (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-display text-xl text-text tracking-tight">
                    {study.description}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {study.bodyPart} · {study.studyDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <DownloadOriginalButton study={study} report={studyReport} />
                  <div className="rounded-full border border-border bg-surface p-1 flex items-center gap-1">
                    <ToggleChip
                      active={view === "image"}
                      onClick={() => setView("image")}
                      emoji="🖼️"
                    >
                      Image
                    </ToggleChip>
                    <ToggleChip
                      active={view === "report"}
                      onClick={() => setView("report")}
                      emoji="📄"
                    >
                      Report
                    </ToggleChip>
                  </div>
                </div>
              </div>

              {view === "image" ? (
                <>
                  <DicomViewer
                    study={study}
                    annotations={studyAnnotations}
                    readOnly
                  />
                  {studyAnnotations.length > 0 && (
                    <PatientLegend annotations={studyAnnotations} />
                  )}
                </>
              ) : (
                <RadiologyReportPanel
                  study={study}
                  report={studyReport}
                  audience="patient"
                />
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-text-muted">
              Pick a study from the list to view it.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Filters({
  modality,
  onModality,
  modalitiesAvailable,
  dateRange,
  onDateRange,
  resultCount,
}: {
  modality: Modality | "all";
  onModality: (m: Modality | "all") => void;
  modalitiesAvailable: Modality[];
  dateRange: DateRange;
  onDateRange: (d: DateRange) => void;
  resultCount: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
      <span className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold">
        Filter
      </span>
      <label className="flex items-center gap-2">
        <span className="text-text-muted text-xs">Type</span>
        <select
          value={modality}
          onChange={(e) => onModality(e.target.value as Modality | "all")}
          className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="all">All types</option>
          {modalitiesAvailable.map((m) => (
            <option key={m} value={m}>
              {MODALITY_LABEL[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-text-muted text-xs">Date</span>
        <select
          value={dateRange}
          onChange={(e) => onDateRange(e.target.value as DateRange)}
          className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="all">All time</option>
          <option value="12m">Last 12 months</option>
          <option value="24m">Last 24 months</option>
        </select>
      </label>
      <span className="ml-auto text-xs text-text-subtle">
        {resultCount} stud{resultCount === 1 ? "y" : "ies"}
      </span>
    </div>
  );
}

function DownloadOriginalButton({
  study,
  report,
}: {
  study: ImagingStudy;
  report: RadiologyReport | null;
}) {
  const onDownload = () => {
    // Real DICOM bytes live in object storage; we hand the patient a
    // manifest with the study identifiers + signed-URL placeholders
    // so they always have a tangible record. The download path can be
    // upgraded to a zip stream once the storage adapter is wired.
    const manifest = {
      generatedAt: new Date().toISOString(),
      study: {
        id: study.id,
        modality: study.modality,
        description: study.description,
        bodyPart: study.bodyPart,
        studyDate: study.studyDate,
        indication: study.indication,
        radiologistName: study.radiologistName,
        series: study.series,
      },
      report: report
        ? {
            patientSummary: report.patientSummary,
            severity: report.severity,
            signedBy: report.signedBy,
            signedAt: report.signedAt,
          }
        : null,
      note:
        "Your full DICOM file is available on request from your care team. " +
        "For most uses, this PDF-equivalent manifest is what you'll need to share with another provider.",
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${study.id}-${study.studyDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={onDownload}
      className="text-xs h-8 px-3 rounded-full border border-border bg-surface hover:bg-surface-muted text-text-muted hover:text-text transition-colors"
      title="Download a manifest you can share with another provider"
    >
      ⬇ Download
    </button>
  );
}

function PatientLegend({ annotations }: { annotations: ImagingAnnotation[] }) {
  const visible = annotations.filter(
    (a) => a.patientVisible && a.severity !== "critical",
  );
  if (visible.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
      <h3 className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold">
        What your provider highlighted
      </h3>
      <ul className="space-y-1.5">
        {visible.map((a) => (
          <li key={a.id} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden
              className={cn(
                "mt-1 h-2 w-2 rounded-full shrink-0",
                a.severity === "significant"
                  ? "bg-amber-500"
                  : a.severity === "minor"
                    ? "bg-sky-500"
                    : "bg-emerald-500",
              )}
            />
            <span className="text-text">
              {a.note ?? "Marked for discussion at your next visit."}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  emoji?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 px-3.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
        active
          ? "bg-accent text-accent-ink shadow-sm"
          : "text-text-muted hover:text-text",
      )}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      {children}
    </button>
  );
}

function uniqueModalities(studies: ImagingStudy[]): Modality[] {
  const seen = new Set<Modality>();
  for (const s of studies) seen.add(s.modality);
  return Array.from(seen);
}

function computeCutoff(range: DateRange): string | null {
  if (range === "all") return null;
  const months = range === "12m" ? 12 : 24;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}
