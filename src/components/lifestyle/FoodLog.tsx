"use client";

// EMR-139 — Food log
// Patient food journal with three entry paths: photo upload (OCR meal
// recognition), barcode scan, and manual. Macro breakdown updates live as
// the patient adds meals. Local-only persistence for now — the analyses
// match the API shape we expect once the vision and barcode services land.

import * as React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_TARGETS,
  buildEntryFromBarcode,
  buildEntryFromOcr,
  lookupBarcode,
  recognizeMealFromPhotoHint,
  scaleMacros,
  summarizeDay,
  type DailyTargets,
  type FoodEntry,
  type MacroBreakdown,
  type MealSlot,
  type OcrCandidate,
} from "@/lib/lifestyle/food-tracker";

const STORAGE_KEY = "lj-food-log";

const SLOTS: { id: MealSlot; emoji: string; label: string }[] = [
  { id: "breakfast", emoji: "\u{1F373}", label: "Breakfast" },
  { id: "lunch", emoji: "\u{1F96A}", label: "Lunch" },
  { id: "dinner", emoji: "\u{1F37D}\u{FE0F}", label: "Dinner" },
  { id: "snack", emoji: "\u{1F36B}", label: "Snack" },
];

interface Props {
  patientId?: string;
  targets?: DailyTargets;
  /** Hydration entries — useful for SSR demos and tests. */
  initialEntries?: FoodEntry[];
}

function readEntries(): FoodEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FoodEntry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: FoodEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function FoodLog({
  targets = DEFAULT_TARGETS,
  initialEntries = [],
}: Props) {
  const [entries, setEntries] = React.useState<FoodEntry[]>(initialEntries);
  const [hydrated, setHydrated] = React.useState(false);
  const [activeSlot, setActiveSlot] = React.useState<MealSlot>("breakfast");
  const [mode, setMode] = React.useState<"photo" | "barcode" | "manual">(
    "photo",
  );

  React.useEffect(() => {
    const stored = readEntries();
    setEntries(stored.length ? stored : initialEntries);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const summary = summarizeDay(entries, today, targets);

  function addEntry(entry: FoodEntry) {
    setEntries((prev) => {
      const next = [entry, ...prev];
      writeEntries(next);
      return next;
    });
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeEntries(next);
      return next;
    });
  }

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <DailyTotalsCard targets={targets} summary={summary} />

      <Card tone="raised">
        <CardContent className="pt-5 pb-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSlot(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs transition-all",
                  activeSlot === s.id
                    ? "bg-accent-soft border-accent text-accent"
                    : "bg-surface-muted border-border text-text-muted hover:border-accent",
                )}
              >
                <span aria-hidden="true">{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <ModeTab id="photo" current={mode} onChange={setMode} label="Photo" />
            <ModeTab id="barcode" current={mode} onChange={setMode} label="Barcode" />
            <ModeTab id="manual" current={mode} onChange={setMode} label="Manual" />
          </div>

          {mode === "photo" && (
            <PhotoEntry slot={activeSlot} onAdd={addEntry} />
          )}
          {mode === "barcode" && (
            <BarcodeEntry slot={activeSlot} onAdd={addEntry} />
          )}
          {mode === "manual" && (
            <ManualEntry slot={activeSlot} onAdd={addEntry} />
          )}
        </CardContent>
      </Card>

      <DailyEntriesList
        entries={entries.filter((e) => e.loggedAt.slice(0, 10) === today)}
        onRemove={removeEntry}
      />
    </div>
  );
}

function DailyTotalsCard({
  targets,
  summary,
}: {
  targets: DailyTargets;
  summary: ReturnType<typeof summarizeDay>;
}) {
  return (
    <Card tone="raised">
      <CardContent className="pt-5 pb-6">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-subtle">
              Today
            </p>
            <h3 className="font-display text-xl text-text tracking-tight mt-0.5">
              Daily macros
            </h3>
          </div>
          <Badge tone="neutral" className="text-[10px]">
            {Math.round(summary.totals.calories)} / {targets.calories} kcal
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MacroPie
            label="Calories"
            value={summary.totals.calories}
            target={targets.calories}
          />
          <MacroPie
            label="Protein"
            value={summary.totals.proteinG}
            target={targets.proteinG}
            unit="g"
          />
          <MacroPie
            label="Carbs"
            value={summary.totals.carbsG}
            target={targets.carbsG}
            unit="g"
          />
          <MacroPie
            label="Fat"
            value={summary.totals.fatG}
            target={targets.fatG}
            unit="g"
          />
        </div>
        {summary.cannabisInfusedMg > 0 && (
          <p className="text-[11px] text-text-subtle mt-3">
            Includes {Math.round(summary.cannabisInfusedMg)} mg cannabis-infused
            food today.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MacroPie({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
}) {
  const pct = target === 0 ? 0 : Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="rounded-xl border border-border bg-surface-muted/30 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-text-subtle">
        {label}
      </p>
      <p className="font-display text-lg text-text mt-1 leading-none">
        {Math.round(value)}
        {unit ? <span className="text-sm text-text-subtle">{unit}</span> : null}
      </p>
      <div
        className="mt-2 h-1.5 rounded-full bg-surface-muted overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-text-subtle mt-1">
        {pct}% of {target}
        {unit ?? ""}
      </p>
    </div>
  );
}

function ModeTab({
  id,
  current,
  onChange,
  label,
}: {
  id: "photo" | "barcode" | "manual";
  current: string;
  onChange: (m: "photo" | "barcode" | "manual") => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(id)}
      className={cn(
        "px-3 py-1 rounded-full text-xs border transition-all",
        current === id
          ? "bg-text text-surface border-text"
          : "bg-surface-muted text-text-muted border-border hover:border-accent",
      )}
    >
      {label}
    </button>
  );
}

function PhotoEntry({
  slot,
  onAdd,
}: {
  slot: MealSlot;
  onAdd: (e: FoodEntry) => void;
}) {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [hint, setHint] = React.useState("");
  const [candidates, setCandidates] = React.useState<OcrCandidate[]>([]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setPhotoUrl(url);
      const guess = file.name;
      const next = recognizeMealFromPhotoHint(hint || guess);
      setCandidates(next);
    };
    reader.readAsDataURL(file);
  }

  function reanalyze() {
    setCandidates(recognizeMealFromPhotoHint(hint));
  }

  function pick(c: OcrCandidate) {
    onAdd(
      buildEntryFromOcr({
        candidate: c,
        slot,
        servingsConsumed: 1,
        photoDataUrl: photoUrl ?? undefined,
      }),
    );
    setPhotoUrl(null);
    setHint("");
    setCandidates([]);
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.16em] text-text-subtle block mb-1">
          Photo
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          className="text-sm text-text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-muted file:px-3 file:py-1.5 file:text-xs"
        />
      </label>
      {photoUrl && (
        <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border">
          <Image
            src={photoUrl}
            alt="Meal photo"
            fill
            sizes="128px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.16em] text-text-subtle block mb-1">
          Description (optional)
        </span>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="grain bowl with chicken, salad, slice of pizza..."
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>
      <Button size="sm" variant="secondary" onClick={reanalyze} disabled={!hint}>
        Re-analyze
      </Button>

      {candidates.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">
            Suggestions
          </p>
          {candidates.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => pick(c)}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-left hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-text">{c.label}</p>
                <Badge tone="accent" className="text-[10px]">
                  {Math.round(c.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-[11px] text-text-subtle">{c.servingDescription}</p>
              <MacroLine macros={c.macros} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BarcodeEntry({
  slot,
  onAdd,
}: {
  slot: MealSlot;
  onAdd: (e: FoodEntry) => void;
}) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function lookup() {
    const found = lookupBarcode(code.trim());
    if (!found) {
      setError("Barcode not in our local catalog yet — try manual entry.");
      return;
    }
    onAdd(buildEntryFromBarcode({ product: found, slot, servingsConsumed: 1 }));
    setCode("");
    setError(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-text-subtle leading-relaxed">
        Try <code className="text-accent">0049000028904</code>,{" "}
        <code className="text-accent">0762111800015</code>, or{" "}
        <code className="text-accent">0851610002088</code>.
      </p>
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.16em] text-text-subtle block mb-1">
          Barcode
        </span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="0762111800015"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>
      <Button size="sm" onClick={lookup} disabled={!code.trim()}>
        Look up
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function ManualEntry({
  slot,
  onAdd,
}: {
  slot: MealSlot;
  onAdd: (e: FoodEntry) => void;
}) {
  const [label, setLabel] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [carbs, setCarbs] = React.useState("");
  const [fat, setFat] = React.useState("");

  function save() {
    if (!label.trim()) return;
    onAdd({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `food-${Date.now()}`,
      loggedAt: new Date().toISOString(),
      slot,
      label: label.trim(),
      servingDescription: "1 serving",
      servingsConsumed: 1,
      source: "manual",
      macros: {
        calories: Number(calories) || 0,
        proteinG: Number(protein) || 0,
        carbsG: Number(carbs) || 0,
        fatG: Number(fat) || 0,
      },
    });
    setLabel("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="What did you eat?"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <NumberField label="kcal" value={calories} onChange={setCalories} />
        <NumberField label="protein g" value={protein} onChange={setProtein} />
        <NumberField label="carbs g" value={carbs} onChange={setCarbs} />
        <NumberField label="fat g" value={fat} onChange={setFat} />
      </div>
      <Button size="sm" onClick={save} disabled={!label.trim()}>
        Add to {slot}
      </Button>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.14em] text-text-subtle block mb-1">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function MacroLine({ macros }: { macros: MacroBreakdown }) {
  return (
    <p className="text-[11px] text-text-muted mt-1">
      {macros.calories} kcal · P {macros.proteinG}g · C {macros.carbsG}g · F{" "}
      {macros.fatG}g
    </p>
  );
}

function DailyEntriesList({
  entries,
  onRemove,
}: {
  entries: FoodEntry[];
  onRemove: (id: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 py-6 text-center">
        <p className="text-sm text-text-muted">
          Nothing logged yet today. Snap a photo or scan a barcode to start.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-xl border border-border bg-surface-raised px-4 py-3 flex items-start gap-3"
        >
          <Badge tone="neutral" className="text-[10px] capitalize shrink-0">
            {entry.slot}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text">{entry.label}</p>
            <p className="text-[11px] text-text-subtle">
              {entry.servingDescription} · {entry.source}
            </p>
            <MacroLine
              macros={scaleMacros(entry.macros, entry.servingsConsumed)}
            />
          </div>
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="text-xs text-text-subtle hover:text-danger transition-colors"
            aria-label="Remove entry"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
