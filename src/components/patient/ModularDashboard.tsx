"use client";

// EMR-186 — Patient Modular Dashboard (client surface).
//
// Renders a configurable set of dashboard widgets the patient can drag
// to reorder. Layout is persisted to localStorage under a stable key
// per user device. We deliberately use the native HTML5 drag-and-drop
// API rather than pulling in dnd-kit / react-beautiful-dnd — the
// widget count is small (8), the interaction surface is forgiving, and
// the dependency budget for a single dashboard isn't worth a 25KB
// runtime addition.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GripVertical, RefreshCcw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatFromNow, formatRelative } from "@/lib/utils/format";

const STORAGE_KEY = "lj.patient.dashboard.layout.v1";

type WidgetId =
  | "health-score"
  | "lifestyle-rings"
  | "lab-trends"
  | "ai-tips"
  | "mood-tracker"
  | "cannabis-intake"
  | "appointment"
  | "outcomes-trend";

const DEFAULT_ORDER: WidgetId[] = [
  "health-score",
  "appointment",
  "lifestyle-rings",
  "cannabis-intake",
  "outcomes-trend",
  "lab-trends",
  "mood-tracker",
  "ai-tips",
];

const WIDGET_TITLES: Record<WidgetId, string> = {
  "health-score": "Health score",
  "lifestyle-rings": "Lifestyle rings",
  "lab-trends": "Lab trends",
  "ai-tips": "AI tips",
  "mood-tracker": "Mood tracker",
  "cannabis-intake": "Cannabis intake",
  appointment: "Next appointment",
  "outcomes-trend": "Outcomes trend",
};

export interface ModularDashboardData {
  firstName: string;
  latest: Record<string, number>;
  series: Record<string, number[]>;
  nextVisit: {
    id: string;
    scheduledFor: string | null;
    modality: string | null;
  } | null;
  regimenCount: number;
  totalThc: number;
  totalCbd: number;
  labs: Array<{
    id: string;
    name: string;
    abnormal: boolean;
    receivedAt: string | null;
  }>;
}

function loadOrder(): WidgetId[] {
  if (typeof window === "undefined") return DEFAULT_ORDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ORDER;
    const known = parsed.filter((id): id is WidgetId =>
      DEFAULT_ORDER.includes(id as WidgetId),
    );
    // Append any new widgets the user hasn't seen yet.
    for (const id of DEFAULT_ORDER) {
      if (!known.includes(id)) known.push(id);
    }
    return known;
  } catch {
    return DEFAULT_ORDER;
  }
}

function saveOrder(order: WidgetId[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Quota / private browsing — fall through silently. Dropping the
    // persistence is preferable to crashing the dashboard.
  }
}

export function ModularDashboard({ data }: { data: ModularDashboardData }) {
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
  const [draggingId, setDraggingId] = useState<WidgetId | null>(null);

  // Load persisted layout once on the client. We start with the default
  // order so SSR and the first paint match.
  useEffect(() => {
    setOrder(loadOrder());
  }, []);

  function move(from: WidgetId, to: WidgetId) {
    if (from === to) return;
    setOrder((prev) => {
      const next = prev.slice();
      const fromIdx = next.indexOf(from);
      const toIdx = next.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      saveOrder(next);
      return next;
    });
  }

  function reset() {
    setOrder(DEFAULT_ORDER);
    saveOrder(DEFAULT_ORDER);
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <Button variant="ghost" size="sm" onClick={reset}>
          <RefreshCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          Reset layout
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {order.map((id) => (
          <WidgetShell
            key={id}
            id={id}
            isDragging={draggingId === id}
            onDragStart={() => setDraggingId(id)}
            onDragEnd={() => setDraggingId(null)}
            onDropOn={(from) => move(from, id)}
          >
            <Widget id={id} data={data} />
          </WidgetShell>
        ))}
      </div>
    </div>
  );
}

function WidgetShell({
  id,
  children,
  isDragging,
  onDragStart,
  onDragEnd,
  onDropOn,
}: {
  id: WidgetId;
  children: React.ReactNode;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: (from: WidgetId) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/widget-id", id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("text/widget-id")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(e) => {
        const from = e.dataTransfer.getData("text/widget-id") as WidgetId;
        if (from && from !== id) {
          e.preventDefault();
          onDropOn(from);
        }
      }}
      className={cn(
        "relative group transition-opacity",
        isDragging && "opacity-40",
      )}
      aria-label={`${WIDGET_TITLES[id]} widget — drag to reorder`}
    >
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-text-subtle pointer-events-none">
        <GripVertical className="h-4 w-4" aria-hidden />
      </div>
      {children}
    </div>
  );
}

function Widget({
  id,
  data,
}: {
  id: WidgetId;
  data: ModularDashboardData;
}) {
  switch (id) {
    case "health-score":
      return <HealthScoreWidget data={data} />;
    case "lifestyle-rings":
      return <LifestyleRingsWidget data={data} />;
    case "lab-trends":
      return <LabTrendsWidget data={data} />;
    case "ai-tips":
      return <AITipsWidget data={data} />;
    case "mood-tracker":
      return <MoodTrackerWidget data={data} />;
    case "cannabis-intake":
      return <CannabisIntakeWidget data={data} />;
    case "appointment":
      return <AppointmentWidget data={data} />;
    case "outcomes-trend":
      return <OutcomesTrendWidget data={data} />;
  }
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

function computeHealthScore(latest: Record<string, number>): number {
  // Same shape as portal/page.tsx — keeps both surfaces in sync until
  // the score moves to a domain helper.
  let score = 50;
  if (latest.pain !== undefined) score += (10 - latest.pain) * 2;
  if (latest.sleep !== undefined) score += latest.sleep * 1.5;
  if (latest.mood !== undefined) score += latest.mood * 1.5;
  if (latest.anxiety !== undefined) score += (10 - latest.anxiety) * 1.5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const colour =
    score >= 80 ? "var(--accent)" : score >= 60 ? "#D4A04E" : "#C76A4A";
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx={40} cy={40} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={6} />
        <circle
          cx={40}
          cy={40}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-xl font-semibold text-text">
        {score}
      </div>
    </div>
  );
}

function HealthScoreWidget({ data }: { data: ModularDashboardData }) {
  const score = computeHealthScore(data.latest);
  return (
    <Card tone="raised" className="h-full">
      <CardContent className="py-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
          Health score
        </p>
        <div className="flex items-center gap-4">
          <ScoreRing score={score} />
          <div>
            <p className="font-display text-base text-text">
              {score >= 80
                ? "Trending strong"
                : score >= 60
                  ? "Holding steady"
                  : "Let's check in"}
            </p>
            <p className="text-xs text-text-muted leading-snug mt-1">
              Computed from your latest sleep, mood, pain, and anxiety scores.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Ring({
  label,
  emoji,
  value,
}: {
  label: string;
  emoji: string;
  value: number | undefined;
}) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const v = value !== undefined ? value : 0;
  const dash = (v / 10) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-12 w-12">
        <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
          <circle cx={24} cy={24} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={4} />
          <circle
            cx={24}
            cy={24}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-base">
          {emoji}
        </div>
      </div>
      <span className="text-[10px] text-text-subtle font-medium uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function LifestyleRingsWidget({ data }: { data: ModularDashboardData }) {
  return (
    <Card tone="raised" className="h-full">
      <CardContent className="py-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-4">
          Lifestyle rings
        </p>
        <div className="flex items-end justify-around">
          <Ring label="Sleep" emoji="😴" value={data.latest.sleep} />
          <Ring label="Mood" emoji="😊" value={data.latest.mood} />
          <Ring label="Energy" emoji="⚡" value={data.latest.energy} />
          <Ring
            label="Calm"
            emoji="🧘"
            value={
              data.latest.anxiety !== undefined ? 10 - data.latest.anxiety : undefined
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LabTrendsWidget({ data }: { data: ModularDashboardData }) {
  return (
    <Card tone="raised" className="h-full">
      <CardContent className="py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">
            Lab trends
          </p>
          <Link href="/portal/labs" className="text-xs text-accent hover:underline">
            View all
          </Link>
        </div>
        {data.labs.length === 0 ? (
          <p className="text-sm text-text-muted">No labs yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.labs.slice(0, 4).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text truncate min-w-0 mr-2">
                  {l.name}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {l.abnormal && <Badge tone="warning">Flag</Badge>}
                  <span className="text-xs text-text-muted">
                    {l.receivedAt ? formatRelative(l.receivedAt) : "—"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AITipsWidget({ data }: { data: ModularDashboardData }) {
  const tips: string[] = [];
  if ((data.latest.pain ?? 0) > 5) {
    tips.push("Pain has been elevated — try logging when it spikes to spot patterns.");
  }
  if ((data.latest.sleep ?? 10) < 5) {
    tips.push("Sleep is low. A consistent bedtime + screens off before bed can help.");
  }
  if ((data.latest.anxiety ?? 0) > 6) {
    tips.push("Anxiety is high — even five minutes of breathwork brings it down a notch.");
  }
  if (tips.length === 0) {
    tips.push("Nothing flagged today. Keep logging — it gives your team the full picture.");
  }
  return (
    <Card tone="raised" className="h-full">
      <CardContent className="py-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent mb-3">
          AI tips
        </p>
        <ul className="space-y-2.5">
          {tips.slice(0, 2).map((t, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-[10px] font-medium mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-text-muted leading-relaxed">{t}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function MoodTrackerWidget({ data }: { data: ModularDashboardData }) {
  const mood = data.latest.mood;
  const emoji =
    mood === undefined
      ? "🌱"
      : mood >= 7
        ? "😊"
        : mood >= 4
          ? "😐"
          : "😞";
  const message =
    mood === undefined
      ? "Log a check-in"
      : mood >= 7
        ? "Feeling good"
        : mood >= 4
          ? "Hanging in there"
          : "Tough day";
  return (
    <Card tone="raised" className="h-full">
      <CardContent className="py-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
          Mood tracker
        </p>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{emoji}</span>
          <div>
            <p className="font-display text-base text-text">{message}</p>
            <Link
              href="/portal/outcomes"
              className="text-xs text-accent hover:underline"
            >
              Log mood
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CannabisIntakeWidget({ data }: { data: ModularDashboardData }) {
  return (
    <Card tone="raised" className="h-full">
      <CardContent className="py-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
          Cannabis intake
        </p>
        {data.regimenCount === 0 ? (
          <>
            <p className="text-sm text-text-muted">
              No active regimen yet.
            </p>
            <Link
              href="/portal/dosing"
              className="mt-3 inline-block text-xs text-accent hover:underline"
            >
              Start a plan
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-4">
              <div>
                <p className="font-display text-2xl text-accent tabular-nums font-medium">
                  {data.totalThc.toFixed(1)}
                </p>
                <p className="text-[10px] text-text-muted">mg THC/day</p>
              </div>
              <div>
                <p className="font-display text-2xl text-[color:var(--highlight)] tabular-nums font-medium">
                  {data.totalCbd.toFixed(1)}
                </p>
                <p className="text-[10px] text-text-muted">mg CBD/day</p>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-3">
              {data.regimenCount} active regimen
              {data.regimenCount === 1 ? "" : "s"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentWidget({ data }: { data: ModularDashboardData }) {
  const visit = data.nextVisit;
  return (
    <Card tone="raised" className="h-full">
      <CardContent className="py-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
          Next appointment
        </p>
        {visit && visit.scheduledFor ? (
          <>
            <p className="font-display text-lg text-text tracking-tight">
              {formatDate(visit.scheduledFor)}
            </p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-muted">
                {formatFromNow(visit.scheduledFor)}
              </span>
              {visit.modality && (
                <Badge tone="accent" className="text-[10px]">
                  {visit.modality}
                </Badge>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text-muted">No visit scheduled.</p>
            <Link
              href="/portal/schedule"
              className="mt-3 inline-block text-xs text-accent hover:underline"
            >
              Book one
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OutcomesTrendWidget({ data }: { data: ModularDashboardData }) {
  const painSeries = data.series.pain ?? [];
  const sleepSeries = data.series.sleep ?? [];
  return (
    <Card tone="raised" className="h-full">
      <CardContent className="py-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
          Outcomes trend
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Pain</span>
              <span>{data.latest.pain?.toFixed(1) ?? "—"}</span>
            </div>
            <Sparkline
              data={painSeries.length > 1 ? painSeries : [0]}
              width={240}
              height={32}
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Sleep</span>
              <span>{data.latest.sleep?.toFixed(1) ?? "—"}</span>
            </div>
            <Sparkline
              data={sleepSeries.length > 1 ? sleepSeries : [0]}
              width={240}
              height={32}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
