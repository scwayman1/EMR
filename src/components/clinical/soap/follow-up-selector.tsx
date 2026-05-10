// SAFE: dead-export-allowed reason="Orphan PR from before rules"
"use client";


import { useMemo, useState } from "react";
import { Calendar, Check, Clock, Sparkles } from "lucide-react";

export type IntervalUnit = "days" | "weeks" | "months" | "years";

export interface FollowUpInterval {
  value: number;
  unit: IntervalUnit;
  label: string;
  targetDate: string;
  notes?: string;
}

export interface FollowUpSelectorProps {
  initialValue?: number;
  initialUnit?: IntervalUnit;
  initialNotes?: string;
  baseDate?: Date;
  onChange?: (interval: FollowUpInterval) => void;
  className?: string;
}

interface PresetOption {
  value: number;
  unit: IntervalUnit;
  label: string;
  helper: string;
  emoji: string;
}

const PRESETS: PresetOption[] = [
  { value: 1, unit: "weeks", label: "1 Week", helper: "Acute follow-up", emoji: "\u{1F331}" },
  { value: 2, unit: "weeks", label: "2 Weeks", helper: "Titration check", emoji: "\u{1F33F}" },
  { value: 1, unit: "months", label: "1 Month", helper: "Standard re-eval", emoji: "\u{1F343}" },
  { value: 3, unit: "months", label: "3 Months", helper: "Stable maintenance", emoji: "\u{1F333}" },
  { value: 6, unit: "months", label: "6 Months", helper: "Long-term follow-up", emoji: "\u{1F332}" },
  { value: 1, unit: "years", label: "1 Year", helper: "Annual review", emoji: "\u{1F334}" },
];

const CUSTOM_UNIT_OPTIONS: { value: IntervalUnit; label: string }[] = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
];

function addInterval(base: Date, value: number, unit: IntervalUnit): Date {
  const d = new Date(base.getTime());
  if (unit === "days") {
    d.setDate(d.getDate() + value);
  } else if (unit === "weeks") {
    d.setDate(d.getDate() + value * 7);
  } else if (unit === "months") {
    d.setMonth(d.getMonth() + value);
  } else if (unit === "years") {
    d.setFullYear(d.getFullYear() + value);
  }
  return d;
}

function formatTargetDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLabel(value: number, unit: IntervalUnit): string {
  const singular: Record<IntervalUnit, string> = {
    days: "Day",
    weeks: "Week",
    months: "Month",
    years: "Year",
  };
  const word = singular[unit];
  return `${value} ${value === 1 ? word : `${word}s`}`;
}

export function FollowUpSelector({
  initialValue = 1,
  initialUnit = "months",
  initialNotes = "",
  baseDate,
  onChange,
  className,
}: FollowUpSelectorProps) {
  const today = useMemo(() => baseDate ?? new Date(), [baseDate]);

  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [activePreset, setActivePreset] = useState<string>(() => {
    const match = PRESETS.find(
      (p) => p.value === initialValue && p.unit === initialUnit,
    );
    return match ? `${match.value}-${match.unit}` : "1-months";
  });
  const [customValue, setCustomValue] = useState<number>(initialValue);
  const initialCustomUnit: IntervalUnit =
    initialUnit === "years" ? "months" : initialUnit;
  const [customUnit, setCustomUnit] = useState<IntervalUnit>(initialCustomUnit);
  const [notes, setNotes] = useState<string>(initialNotes);

  const activeInterval = useMemo<FollowUpInterval>(() => {
    if (mode === "preset") {
      const preset =
        PRESETS.find((p) => `${p.value}-${p.unit}` === activePreset) ??
        PRESETS[2];
      const target = addInterval(today, preset.value, preset.unit);
      return {
        value: preset.value,
        unit: preset.unit,
        label: buildLabel(preset.value, preset.unit),
        targetDate: formatIso(target),
        notes: notes.trim() || undefined,
      };
    }
    const safeValue = Math.max(1, Math.floor(customValue || 1));
    const target = addInterval(today, safeValue, customUnit);
    return {
      value: safeValue,
      unit: customUnit,
      label: buildLabel(safeValue, customUnit),
      targetDate: formatIso(target),
      notes: notes.trim() || undefined,
    };
  }, [mode, activePreset, customValue, customUnit, notes, today]);

  const emit = (next: FollowUpInterval) => {
    onChange?.(next);
  };

  const handlePreset = (preset: PresetOption) => {
    setMode("preset");
    setActivePreset(`${preset.value}-${preset.unit}`);
    setCustomValue(preset.value);
    if (preset.unit !== "years") {
      setCustomUnit(preset.unit);
    }
    const target = addInterval(today, preset.value, preset.unit);
    emit({
      value: preset.value,
      unit: preset.unit,
      label: buildLabel(preset.value, preset.unit),
      targetDate: formatIso(target),
      notes: notes.trim() || undefined,
    });
  };

  const handleCustomChange = (nextValue: number, nextUnit: IntervalUnit) => {
    setMode("custom");
    setCustomValue(nextValue);
    setCustomUnit(nextUnit);
    setActivePreset("");
    const safeValue = Math.max(1, Math.floor(nextValue || 1));
    const target = addInterval(today, safeValue, nextUnit);
    emit({
      value: safeValue,
      unit: nextUnit,
      label: buildLabel(safeValue, nextUnit),
      targetDate: formatIso(target),
      notes: notes.trim() || undefined,
    });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    emit({ ...activeInterval, notes: value.trim() || undefined });
  };

  const targetDateDisplay = useMemo(() => {
    const [y, m, d] = activeInterval.targetDate.split("-").map(Number);
    return formatTargetDate(new Date(y, m - 1, d));
  }, [activeInterval.targetDate]);

  return (
    <section
      className={`rounded-3xl border border-[var(--border)] bg-white shadow-sm overflow-hidden ${className ?? ""}`}
      aria-labelledby="follow-up-selector-title"
    >
      <header className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-[var(--border)]/60 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="follow-up-selector-title"
              className="text-base font-semibold text-text tracking-tight"
            >
              Follow-up Interval
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              When should the patient return for re-evaluation?
            </p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end text-right">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Next Visit
          </span>
          <span className="text-sm font-semibold text-text mt-0.5">
            {targetDateDisplay}
          </span>
        </div>
      </header>

      <div className="px-6 py-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Quick Presets
            </span>
            <span className="text-[11px] text-text-muted flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Tap to select
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PRESETS.map((preset) => {
              const id = `${preset.value}-${preset.unit}`;
              const isActive = mode === "preset" && activePreset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`group relative text-left rounded-2xl border px-3.5 py-3 transition-all duration-150 ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30 shadow-sm"
                      : "border-[var(--border)] bg-white hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5"
                  }`}
                  aria-pressed={isActive}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none" aria-hidden="true">
                        {preset.emoji}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-text">
                          {preset.label}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {preset.helper}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 bg-[var(--surface-muted)]/40">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Or Custom Interval
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 min-w-0">
              <label htmlFor="follow-up-custom-value" className="sr-only">
                Number of intervals
              </label>
              <input
                id="follow-up-custom-value"
                type="number"
                min={1}
                max={365}
                value={mode === "custom" ? customValue : ""}
                placeholder="e.g. 10"
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10);
                  handleCustomChange(
                    Number.isFinite(next) ? next : 1,
                    customUnit,
                  );
                }}
                className={`w-full h-11 px-3.5 bg-white border rounded-xl text-sm font-medium outline-none transition-colors ${
                  mode === "custom"
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
                    : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="follow-up-custom-unit" className="sr-only">
                Time unit
              </label>
              <select
                id="follow-up-custom-unit"
                value={customUnit}
                onChange={(e) =>
                  handleCustomChange(
                    customValue,
                    e.target.value as IntervalUnit,
                  )
                }
                className={`w-full h-11 px-3.5 bg-white border rounded-xl text-sm font-medium outline-none transition-colors appearance-none ${
                  mode === "custom"
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
                    : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                }`}
              >
                {CUSTOM_UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="follow-up-notes"
            className="text-xs font-medium uppercase tracking-wider text-text-muted block mb-2"
          >
            Notes for the visit{" "}
            <span className="text-text-muted/70 normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <textarea
            id="follow-up-notes"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="e.g., Reassess CBD:THC ratio, review sleep diary, repeat LFTs"
            rows={2}
            className="w-full px-3.5 py-2.5 bg-white border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 resize-none transition-colors"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-4 py-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span
              className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-[var(--accent)] shrink-0"
              aria-hidden="true"
            >
              <Calendar className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Return in {activeInterval.label.toLowerCase()}
              </div>
              <div className="text-sm font-semibold text-text truncate">
                {targetDateDisplay}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)] sm:ml-auto self-start sm:self-center">
            Scheduled
          </span>
        </div>
      </div>
    </section>
  );
}

export default FollowUpSelector;
