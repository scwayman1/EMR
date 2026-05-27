"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  MODALITY_LABEL,
  STATUS_LABEL,
  type ImagingStudy,
} from "@/lib/domain/medical-imaging";

interface Props {
  studies: ImagingStudy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

const MODALITY_ICON: Record<string, string> = {
  CT: "🩻",
  MR: "🧠",
  XR: "🦴",
  US: "🫀",
  PT: "✨",
  MG: "🎀",
  NM: "☢️",
};

export function StudyList({ studies, selectedId, onSelect, className }: Props) {
  if (studies.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border p-6 text-sm text-text-muted text-center",
          className,
        )}
      >
        No imaging studies on file.
      </div>
    );
  }
  return (
    <ul className={cn("space-y-2", className)}>
      {studies.map((s) => {
        const active = s.id === selectedId;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={active}
              className={cn(
                "w-full text-left rounded-xl border p-3 transition-colors",
                active
                  ? "border-accent bg-accent-soft/40"
                  : "border-border bg-surface hover:bg-surface-muted",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5" aria-hidden>
                  {MODALITY_ICON[s.modality] ?? "🩺"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-subtle">
                      {MODALITY_LABEL[s.modality]}
                    </span>
                    <StatusPill status={s.status} />
                  </div>
                  <p className="text-sm font-medium text-text mt-0.5 truncate">
                    {s.description}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {s.bodyPart} · {s.studyDate}
                  </p>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function StatusPill({ status }: { status: ImagingStudy["status"] }) {
  const styles: Record<ImagingStudy["status"], string> = {
    uploaded: "bg-slate-100 text-slate-700",
    in_review: "bg-sky-100 text-sky-700",
    preliminary: "bg-amber-100 text-amber-800",
    final: "bg-emerald-100 text-emerald-700",
    addendum: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium",
        styles[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
