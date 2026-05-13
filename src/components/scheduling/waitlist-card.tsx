"use client";

import React from "react";

export type WaitlistPriority = "routine" | "soon" | "urgent";

export interface WaitlistEntry {
  id: string;
  patientName: string;
  requestedRange: string;
  reason: string;
  priority: WaitlistPriority;
  daysWaiting: number;
  preferredProvider?: string;
  contactMethod?: "phone" | "sms" | "email";
}

export interface WaitlistCardProps {
  entry: WaitlistEntry;
  onSchedule?: (entry: WaitlistEntry) => void;
  onNotify?: (entry: WaitlistEntry) => void;
  onRemove?: (entry: WaitlistEntry) => void;
}

const PRIORITY_STYLES: Record<WaitlistPriority, { label: string; tone: string }> = {
  routine: { label: "Routine", tone: "bg-[var(--surface-muted)] text-text-muted border-[var(--border)]" },
  soon: { label: "Soon", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { label: "Urgent", tone: "bg-red-50 text-red-700 border-red-200" },
};

const CONTACT_LABEL: Record<NonNullable<WaitlistEntry["contactMethod"]>, string> = {
  phone: "📞 Phone",
  sms: "💬 SMS",
  email: "✉️ Email",
};

export function WaitlistCard({ entry, onSchedule, onNotify, onRemove }: WaitlistCardProps) {
  const priority = PRIORITY_STYLES[entry.priority];

  return (
    <article
      className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white shadow-sm overflow-hidden"
      aria-labelledby={`wl-${entry.id}-name`}
    >
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`wl-${entry.id}-name`} className="text-base font-semibold text-text truncate">
            {entry.patientName}
          </h3>
          <p className="text-xs text-text-muted truncate mt-0.5">{entry.requestedRange}</p>
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border whitespace-nowrap ${priority.tone}`}>
          {priority.label}
        </span>
      </div>

      <div className="px-5 pb-3 space-y-2 text-sm text-text">
        <div className="flex items-start gap-2">
          <span className="text-text-muted text-xs uppercase tracking-wider w-20 shrink-0 pt-0.5">Reason</span>
          <span className="flex-1">{entry.reason}</span>
        </div>
        {entry.preferredProvider && (
          <div className="flex items-start gap-2">
            <span className="text-text-muted text-xs uppercase tracking-wider w-20 shrink-0 pt-0.5">Provider</span>
            <span className="flex-1">{entry.preferredProvider}</span>
          </div>
        )}
        <div className="flex items-start gap-2">
          <span className="text-text-muted text-xs uppercase tracking-wider w-20 shrink-0 pt-0.5">Waiting</span>
          <span className="flex-1">
            {entry.daysWaiting} {entry.daysWaiting === 1 ? "day" : "days"}
            {entry.contactMethod && (
              <span className="ml-2 text-text-muted">{CONTACT_LABEL[entry.contactMethod]}</span>
            )}
          </span>
        </div>
      </div>

      <div className="px-5 py-3 bg-[var(--surface-muted)]/40 border-t border-[var(--border)] flex flex-wrap items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => onRemove?.(entry)}
          className="text-xs font-medium text-text-muted hover:text-red-600 px-2 py-1"
        >
          Remove
        </button>
        <button
          type="button"
          onClick={() => onNotify?.(entry)}
          className="text-xs font-medium px-3 h-8 rounded-lg border border-[var(--border)] bg-white hover:border-[var(--accent)]"
        >
          Notify
        </button>
        <button
          type="button"
          onClick={() => onSchedule?.(entry)}
          className="text-xs font-medium px-3 h-8 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90"
        >
          Schedule
        </button>
      </div>
    </article>
  );
}

export default WaitlistCard;
