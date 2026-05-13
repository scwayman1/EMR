// SAFE: dead-export-allowed reason="Wave 10 scheduling scaffold (EMR-078); mounted on the scheduling workspace in a later wave"
"use client";

import React, { useState } from "react";

export interface SmsReminderConfig {
  enabled: boolean;
  /** Minutes before appointment to send each reminder, ordered. */
  offsetsMinutes: number[];
}

export interface SmsReminderToggleProps {
  initial?: SmsReminderConfig;
  patientPhone?: string;
  onChange?: (config: SmsReminderConfig) => void;
  className?: string;
}

interface OffsetOption {
  minutes: number;
  label: string;
}

const OFFSET_OPTIONS: OffsetOption[] = [
  { minutes: 60 * 24 * 2, label: "2 days before" },
  { minutes: 60 * 24, label: "1 day before" },
  { minutes: 60 * 2, label: "2 hours before" },
  { minutes: 30, label: "30 minutes before" },
];

const DEFAULT_CONFIG: SmsReminderConfig = {
  enabled: true,
  offsetsMinutes: [60 * 24, 60 * 2],
};

function maskPhone(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return raw;
  const last4 = digits.slice(-4);
  return `••• ••• ${last4}`;
}

export function SmsReminderToggle({
  initial = DEFAULT_CONFIG,
  patientPhone,
  onChange,
  className,
}: SmsReminderToggleProps) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [offsets, setOffsets] = useState<number[]>(initial.offsetsMinutes);

  const emit = (next: SmsReminderConfig) => {
    onChange?.(next);
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    emit({ enabled: next, offsetsMinutes: offsets });
  };

  const toggleOffset = (minutes: number) => {
    setOffsets((prev) => {
      const next = prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes].sort((a, b) => b - a);
      emit({ enabled, offsetsMinutes: next });
      return next;
    });
  };

  const masked = maskPhone(patientPhone);

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-white p-5 ${className ?? ""}`}
      aria-labelledby="sms-reminder-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="sms-reminder-title" className="text-sm font-semibold text-text">
            SMS reminders
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {masked ? `Send to ${masked}` : "Text the patient before their appointment"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggleEnabled}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            enabled ? "bg-[var(--accent)]" : "bg-[var(--surface-muted)] border border-[var(--border)]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <fieldset
        disabled={!enabled}
        className={`mt-4 transition-opacity ${enabled ? "opacity-100" : "opacity-50"}`}
      >
        <legend className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
          When to remind
        </legend>
        <div className="flex flex-wrap gap-2">
          {OFFSET_OPTIONS.map((opt) => {
            const active = offsets.includes(opt.minutes);
            return (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => toggleOffset(opt.minutes)}
                aria-pressed={active}
                className={`text-xs font-medium px-3 h-8 rounded-lg border transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-white text-text border-[var(--border)] hover:border-[var(--accent)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {enabled && offsets.length === 0 && (
          <p className="text-xs text-amber-700 mt-2">
            Choose at least one reminder time, or disable SMS reminders entirely.
          </p>
        )}
      </fieldset>
    </div>
  );
}

export default SmsReminderToggle;
