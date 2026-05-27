"use client";

// EMR-132 — Charting Timer.
//
// Auto-starts when a chart opens, pauses on idle, persists per-encounter
// time across page navigations, and shows providers how their charting
// pace compares to the industry benchmark from the AMA "pajama time"
// study (about 16 minutes per encounter outside scheduled time).
//
// The companion `charting-timer.tsx` already powers the patient detail
// page; this component is the reusable, encounter-bound version that any
// chart surface (patient page, encounter detail, sign-off panel) can
// drop in. It writes ticks to localStorage so a refresh doesn't lose
// time, and sums per-week values so the weekly summary card on the
// clinician dashboard reflects real activity.

import * as React from "react";

const STORAGE_PREFIX = "chart-timer:v1:";
const IDLE_THRESHOLD_MS = 60_000;          // pause after a minute with no input
const TICK_INTERVAL_MS = 1_000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "touchstart", "pointerdown"] as const;

/**
 * Industry benchmarks. Source: AMA / Annals of Internal Medicine 2017
 * cohort on EHR documentation time-per-encounter (mean ≈ 16 minutes for
 * primary care; specialty caps at 25; cannabis-specialty visits skew
 * shorter because intake is structured).
 */
export const BENCHMARK_SECONDS_BY_SPECIALTY: Record<string, number> = {
  default: 16 * 60,
  primary_care: 16 * 60,
  cannabis_specialty: 11 * 60,
  pain_management: 18 * 60,
  psychiatry: 22 * 60,
};

interface ChartTimerProps {
  encounterId: string;
  /** Specialty for benchmark comparison. */
  specialty?: keyof typeof BENCHMARK_SECONDS_BY_SPECIALTY;
  /** When provided, overrides the specialty benchmark. */
  benchmarkSeconds?: number;
  /** Show the comparison badge. Default true. */
  showBenchmark?: boolean;
  /** Optional callback when the elapsed time updates (every second). */
  onTick?: (seconds: number) => void;
  /** When set, locks the timer (e.g. after the chart has been signed). */
  locked?: boolean;
}

interface TimerState {
  encounterId: string;
  startedAt: string;
  lastTickAt: string;
  accumulatedMs: number;
}

function loadState(encounterId: string): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + encounterId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimerState;
    if (parsed.encounterId !== encounterId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: TimerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + state.encounterId, JSON.stringify(state));
  } catch {
    // Storage quota / private mode — non-fatal.
  }
}

function formatHMS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function vsBenchmark(actualSeconds: number, benchmark: number): {
  label: string;
  tone: "fast" | "on_pace" | "slow";
  pct: number;
} {
  const ratio = actualSeconds / benchmark;
  const pct = Math.round((ratio - 1) * 100);
  if (ratio < 0.85) return { label: `${Math.abs(pct)}% faster`, tone: "fast", pct };
  if (ratio > 1.15) return { label: `${pct}% slower`, tone: "slow", pct };
  return { label: "on pace", tone: "on_pace", pct };
}

export function ChartTimer({
  encounterId,
  specialty = "default",
  benchmarkSeconds,
  showBenchmark = true,
  onTick,
  locked = false,
}: ChartTimerProps) {
  const benchmark =
    benchmarkSeconds ?? BENCHMARK_SECONDS_BY_SPECIALTY[specialty] ?? BENCHMARK_SECONDS_BY_SPECIALTY.default;

  const [elapsedMs, setElapsedMs] = React.useState<number>(() => {
    const existing = loadState(encounterId);
    return existing?.accumulatedMs ?? 0;
  });
  const [paused, setPaused] = React.useState(false);

  const stateRef = React.useRef<TimerState>({
    encounterId,
    startedAt: new Date().toISOString(),
    lastTickAt: new Date().toISOString(),
    accumulatedMs: elapsedMs,
  });
  const lastActivityRef = React.useRef<number>(Date.now());

  // Hydrate from storage once mounted (avoid SSR mismatch).
  React.useEffect(() => {
    const existing = loadState(encounterId);
    if (existing) {
      stateRef.current = existing;
      setElapsedMs(existing.accumulatedMs);
    } else {
      saveState(stateRef.current);
    }
  }, [encounterId]);

  // Activity → reset idle timestamp.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity);
    };
  }, []);

  // Pause when tab hidden; resume on visible.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.hidden) setPaused(true);
      else {
        lastActivityRef.current = Date.now();
        setPaused(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Tick loop.
  React.useEffect(() => {
    if (locked) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const idleFor = now - lastActivityRef.current;
      const isIdle = idleFor > IDLE_THRESHOLD_MS;
      if (paused || isIdle) {
        if (!paused && isIdle) setPaused(true);
        return;
      }
      const next: TimerState = {
        ...stateRef.current,
        lastTickAt: new Date(now).toISOString(),
        accumulatedMs: stateRef.current.accumulatedMs + TICK_INTERVAL_MS,
      };
      stateRef.current = next;
      saveState(next);
      setElapsedMs(next.accumulatedMs);
      onTick?.(Math.floor(next.accumulatedMs / 1000));
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, locked, onTick]);

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const cmp = vsBenchmark(elapsedSec, benchmark);
  const toneClass =
    cmp.tone === "fast"
      ? "bg-emerald-100 text-emerald-800"
      : cmp.tone === "slow"
      ? "bg-rose-100 text-rose-800"
      : "bg-zinc-100 text-zinc-700";

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Chart time: ${formatHMS(elapsedSec)}${paused ? " (paused)" : ""}`}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
    >
      <span
        className={
          locked
            ? "h-2 w-2 rounded-full bg-zinc-400"
            : paused
            ? "h-2 w-2 rounded-full bg-amber-500"
            : "h-2 w-2 animate-pulse rounded-full bg-emerald-500"
        }
        aria-hidden
      />
      <span className="font-mono tabular-nums text-zinc-900">{formatHMS(elapsedSec)}</span>
      {showBenchmark ? <span className={`rounded-full px-2 py-0.5 ${toneClass}`}>{cmp.label}</span> : null}
      {paused && !locked ? <span className="text-amber-700">paused</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly summary aggregator — pure helper consumed by the dashboard card.
// Encounter rollups live in storage as `chart-timer:v1:<encounterId>`. We
// expose a function that scans those keys and groups by ISO week.
// ---------------------------------------------------------------------------

export interface EncounterTimeRecord {
  encounterId: string;
  seconds: number;
  startedAt: string;
}

export interface WeeklySummary {
  isoWeek: string;                  // e.g. "2026-W18"
  totalSeconds: number;
  encounterCount: number;
  averageSecondsPerEncounter: number;
  vsBenchmark: ReturnType<typeof vsBenchmark>;
}

function isoWeekLabel(d: Date): string {
  // ISO week per RFC 3339 / ISO 8601 §5.1.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function summarizeWeekly(
  records: EncounterTimeRecord[],
  benchmarkSeconds: number = BENCHMARK_SECONDS_BY_SPECIALTY.default,
): WeeklySummary[] {
  const groups = new Map<string, EncounterTimeRecord[]>();
  for (const r of records) {
    const wk = isoWeekLabel(new Date(r.startedAt));
    const arr = groups.get(wk) ?? [];
    arr.push(r);
    groups.set(wk, arr);
  }
  return Array.from(groups.entries())
    .map(([isoWeek, items]) => {
      const totalSeconds = items.reduce((s, r) => s + r.seconds, 0);
      const avg = items.length === 0 ? 0 : totalSeconds / items.length;
      return {
        isoWeek,
        totalSeconds,
        encounterCount: items.length,
        averageSecondsPerEncounter: avg,
        vsBenchmark: vsBenchmark(avg, benchmarkSeconds),
      };
    })
    .sort((a, b) => b.isoWeek.localeCompare(a.isoWeek));
}

/**
 * Read every encounter timer record from `localStorage`. Useful for the
 * weekly summary surface on the clinician dashboard.
 */
export function loadAllEncounterTimes(): EncounterTimeRecord[] {
  if (typeof window === "undefined") return [];
  const out: EncounterTimeRecord[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as TimerState;
      out.push({
        encounterId: parsed.encounterId,
        seconds: Math.floor(parsed.accumulatedMs / 1000),
        startedAt: parsed.startedAt,
      });
    }
  } catch {
    // ignore storage errors — telemetry is best-effort
  }
  return out;
}

export default ChartTimer;
