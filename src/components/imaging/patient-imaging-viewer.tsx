"use client";

/**
 * Patient Imaging Viewer — EMR-141 + EMR-164
 *
 * Read-only DICOM viewer for the patient portal. Shows only annotations the
 * provider explicitly released (`patientVisible` true and severity != critical),
 * plus a toggle that flips between the image and the radiologist's plain-language
 * report (EMR-164). Reports are gated on `releasedToPatient`.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  type ImagingAnnotation,
  type ImagingStudy,
  type RadiologyReport,
} from "@/lib/domain/medical-imaging";
import { DicomViewerPro } from "./dicom-viewer-pro";
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

export function PatientImagingViewer({ studies, annotations, reports }: Props) {
  const [selectedId, setSelectedId] = React.useState<string | null>(
    studies[0]?.id ?? null,
  );
  const [view, setView] = React.useState<Toggle>("image");

  const study = studies.find((s) => s.id === selectedId) ?? null;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <aside className="lg:col-span-3">
        <h2 className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold mb-2">
          Your imaging
        </h2>
        <StudyList
          studies={studies}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setView("image");
          }}
        />
      </aside>

      <section className="lg:col-span-9 space-y-4">
        {study ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-text tracking-tight">
                  {study.description}
                </h2>
                <p className="text-sm text-text-muted">
                  {study.bodyPart} · {study.studyDate}
                </p>
              </div>
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

            {view === "image" ? (
              <>
                <DicomViewerPro
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
