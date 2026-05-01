"use client";

/**
 * Radiology Report Panel — EMR-164 (right side of the toggle view)
 *
 * Renders findings + impression + recommendation. When `audience="patient"`
 * the panel shows only the plain-language summary (still pulled from the same
 * report record so providers and patients never disagree on what was said).
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  SEVERITY_TONE,
  STATUS_LABEL,
  type ImagingStudy,
  type RadiologyReport,
} from "@/lib/domain/medical-imaging";

interface Props {
  study: ImagingStudy;
  report: RadiologyReport | null;
  audience: "provider" | "patient";
  className?: string;
}

export function RadiologyReportPanel({
  study,
  report,
  audience,
  className,
}: Props) {
  if (!report) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border p-6 text-sm text-text-muted bg-surface",
          className,
        )}
      >
        <p className="font-medium text-text mb-1">No report yet</p>
        <p>
          Status: <span className="font-medium">{STATUS_LABEL[study.status]}</span>.
          {audience === "patient"
            ? " You will see the plain-language summary here once your care team releases it."
            : " Read the images and dictate a report to release findings."}
        </p>
      </div>
    );
  }

  const tone = SEVERITY_TONE[report.severity];
  const isPatient = audience === "patient";
  const blocked = isPatient && !report.releasedToPatient;

  if (blocked) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border p-6 bg-surface",
          className,
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <SeverityBadge severity={report.severity} />
          <span className="text-xs uppercase tracking-wider text-text-subtle">
            Awaiting release
          </span>
        </div>
        <p className="text-sm text-text-muted">
          Your radiologist&apos;s preliminary read is in. Your care team will
          discuss it with you and release the plain-language summary here.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface overflow-hidden",
        tone.ring,
        "ring-1",
        className,
      )}
    >
      <header
        className={cn(
          "px-5 py-4 border-b border-border/60",
          tone.bg,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-subtle">
              {study.modality} · {study.bodyPart} · {study.studyDate}
            </p>
            <h2 className="font-display text-xl text-text tracking-tight mt-1">
              {study.description}
            </h2>
          </div>
          <SeverityBadge severity={report.severity} />
        </div>
        {report.signedBy ? (
          <p className="text-xs text-text-subtle mt-2">
            Signed by {report.signedBy} ·{" "}
            {report.signedAt
              ? new Date(report.signedAt).toLocaleString()
              : "—"}
          </p>
        ) : (
          <p className="text-xs text-amber-700 mt-2 font-medium">
            Preliminary — not yet signed
          </p>
        )}
      </header>

      <div className="p-5 space-y-5">
        {isPatient ? (
          <Section title="What this means">
            <p className="text-sm text-text leading-relaxed whitespace-pre-line">
              {report.patientSummary}
            </p>
          </Section>
        ) : (
          <>
            <Section title="Findings">
              <pre className="text-sm text-text font-sans whitespace-pre-wrap leading-relaxed">
                {report.findings}
              </pre>
            </Section>
            <Section title="Impression">
              <pre className="text-sm text-text font-sans whitespace-pre-wrap leading-relaxed">
                {report.impression}
              </pre>
            </Section>
            {report.recommendation && (
              <Section title="Recommendation">
                <p className="text-sm text-text leading-relaxed">
                  {report.recommendation}
                </p>
              </Section>
            )}
            <Section title="Patient summary">
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
                {report.patientSummary}
              </p>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold mb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: RadiologyReport["severity"];
}) {
  const tone = SEVERITY_TONE[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        tone.bg,
        tone.text,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          severity === "critical"
            ? "bg-rose-500"
            : severity === "significant"
              ? "bg-amber-500"
              : severity === "minor"
                ? "bg-sky-500"
                : "bg-emerald-500",
        )}
      />
      {tone.label}
    </span>
  );
}
