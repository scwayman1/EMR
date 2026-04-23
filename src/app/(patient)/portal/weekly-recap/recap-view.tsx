"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { Eyebrow } from "@/components/ui/ornament";
import { cn } from "@/lib/utils/cn";
import { EMOJI_OPTIONS } from "@/lib/domain/emoji-outcomes";

export interface MetricPoint {
  at: string;
  value: number;
}

export interface RecapData {
  rangeStart: string;
  rangeEnd: string;
  firstName: string;
  avgMood: number | null;
  metrics: {
    pain: MetricPoint[];
    sleep: MetricPoint[];
    anxiety: MetricPoint[];
  };
  highlights: {
    bestDay: { date: string; avg: number } | null;
    mostUsedProduct: { name: string; count: number } | null;
    longestSleep: number | null;
  };
  wins: {
    doseDaysLogged: number;
    checkInsLogged: number;
  };
}

function emojiForMood(value: number) {
  if (value >= 8) return EMOJI_OPTIONS[4]; // amazing
  if (value >= 6) return EMOJI_OPTIONS[3]; // good
  if (value >= 4) return EMOJI_OPTIONS[2]; // neutral
  if (value >= 2) return EMOJI_OPTIONS[1]; // bad
  return EMOJI_OPTIONS[0]; // terrible
}

function captionForMood(value: number | null): string {
  if (value === null) return "Log a few check-ins to see your week.";
  if (value >= 8) return "Amazing week!";
  if (value >= 6) return "Mostly good week!";
  if (value >= 4) return "A steady week.";
  if (value >= 2) return "A tough one — we're with you.";
  return "Hang in there. Let your care team know.";
}

function trendDirection(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  if (Math.abs(diff) < 0.5) return "flat";
  return diff > 0 ? "up" : "down";
}

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(s)} – ${fmt(e)}`;
}

export function RecapView({ data }: { data: RecapData }) {
  const moodEmoji = data.avgMood !== null ? emojiForMood(data.avgMood) : null;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Card tone="ambient" className="rounded-2xl">
        <CardContent className="py-10 px-8 text-center">
          <Eyebrow className="justify-center mb-3">Weekly recap</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-tight">
            Your week in review
          </h1>
          <p className="text-sm text-text-muted mt-2">
            {formatRange(data.rangeStart, data.rangeEnd)}
          </p>

          <div className="mt-8 flex flex-col items-center">
            <span className="text-7xl mb-3">{moodEmoji?.emoji ?? "🌱"}</span>
            <p className="font-display text-xl text-text">
              {captionForMood(data.avgMood)}
            </p>
            {data.avgMood !== null && (
              <p className="text-xs text-text-muted mt-1">
                Average mood {(data.avgMood / 2 + 0.5).toFixed(1)} / 5
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* HIGHLIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HighlightCard
          emoji="🌟"
          label="Best day"
          value={
            data.highlights.bestDay
              ? new Date(data.highlights.bestDay.date).toLocaleDateString(
                  undefined,
                  { weekday: "long" }
                )
              : "Log to find out"
          }
          sub={
            data.highlights.bestDay
              ? `Mood ${(data.highlights.bestDay.avg / 2 + 0.5).toFixed(1)} / 5`
              : null
          }
        />
        <HighlightCard
          emoji="💚"
          label="Most-used product"
          value={data.highlights.mostUsedProduct?.name ?? "—"}
          sub={
            data.highlights.mostUsedProduct
              ? `${data.highlights.mostUsedProduct.count} dose${
                  data.highlights.mostUsedProduct.count === 1 ? "" : "s"
                }`
              : null
          }
        />
        <HighlightCard
          emoji="😴"
          label="Longest sleep score"
          value={
            data.highlights.longestSleep !== null
              ? `${data.highlights.longestSleep.toFixed(1)} / 10`
              : "—"
          }
          sub="Based on your sleep check-ins"
        />
      </div>

      {/* TREND CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrendCard
          label="Pain"
          emoji="🌤️"
          points={data.metrics.pain}
          improvementIsDown
        />
        <TrendCard
          label="Sleep"
          emoji="😴"
          points={data.metrics.sleep}
        />
        <TrendCard
          label="Anxiety"
          emoji="🧘"
          points={data.metrics.anxiety}
          improvementIsDown
        />
      </div>

      {/* WINS */}
      <Card className="rounded-2xl">
        <CardContent className="py-7 px-7">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏆</span>
            <h2 className="font-display text-xl text-text tracking-tight">
              Wins this week
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <WinRow
              icon="📝"
              title={`${data.wins.doseDaysLogged} day${
                data.wins.doseDaysLogged === 1 ? "" : "s"
              } of dose logging`}
              detail="Consistency builds the picture"
            />
            <WinRow
              icon="💛"
              title={`${data.wins.checkInsLogged} check-in${
                data.wins.checkInsLogged === 1 ? "" : "s"
              } captured`}
              detail="Real-world data your care team can act on"
            />
            {data.highlights.mostUsedProduct && (
              <WinRow
                icon="✨"
                title={`Stuck with ${data.highlights.mostUsedProduct.name}`}
                detail="Showing up for your treatment plan"
              />
            )}
            {data.avgMood !== null && data.avgMood >= 6 && (
              <WinRow
                icon="🌈"
                title="Mostly good days"
                detail="Your mood ran above the midline this week"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* SHAREABLE CARD */}
      <Card
        tone="ambient"
        className="rounded-2xl overflow-hidden"
      >
        <CardContent className="py-10 px-10 text-center bg-gradient-to-br from-accent-soft via-surface to-highlight-soft">
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-4 font-semibold">
            Leafjourney recap
          </p>
          <span className="text-6xl block mb-4">{moodEmoji?.emoji ?? "🌱"}</span>
          <p className="font-display text-2xl text-text tracking-tight">
            {data.firstName}'s week
          </p>
          <p className="text-sm text-text-muted mt-1">
            {formatRange(data.rangeStart, data.rangeEnd)}
          </p>
          <div className="mt-6 inline-flex items-center gap-4 text-sm text-text-muted">
            <span>
              <span className="font-semibold text-text">
                {data.wins.doseDaysLogged}
              </span>{" "}
              days logged
            </span>
            <span aria-hidden>•</span>
            <span>
              <span className="font-semibold text-text">
                {data.wins.checkInsLogged}
              </span>{" "}
              check-ins
            </span>
          </div>
          <p className="text-[11px] text-text-subtle mt-6">
            Generated for you by Leafjourney 🌿
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function HighlightCard({
  emoji,
  label,
  value,
  sub,
}: {
  emoji: string;
  label: string;
  value: string;
  sub: string | null;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-6 px-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{emoji}</span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold">
              {label}
            </p>
            <p className="font-display text-lg text-text tracking-tight mt-1 truncate">
              {value}
            </p>
            {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendCard({
  label,
  emoji,
  points,
  improvementIsDown,
}: {
  label: string;
  emoji: string;
  points: MetricPoint[];
  improvementIsDown?: boolean;
}) {
  const values = points.map((p) => p.value);
  const dir = trendDirection(values);
  const improving =
    (improvementIsDown && dir === "down") || (!improvementIsDown && dir === "up");
  const worsening =
    (improvementIsDown && dir === "up") || (!improvementIsDown && dir === "down");

  const tone = improving ? "success" : worsening ? "warning" : "neutral";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const latest = values.length > 0 ? values[values.length - 1] : null;

  return (
    <Card className="rounded-2xl">
      <CardContent className="py-6 px-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <p className="font-display text-base text-text tracking-tight">
              {label}
            </p>
          </div>
          <Badge tone={tone}>
            {arrow} {dir === "flat" ? "steady" : improving ? "improving" : "watch"}
          </Badge>
        </div>

        {values.length >= 2 ? (
          <Sparkline data={values} width={260} height={40} className="w-full" />
        ) : (
          <p className="text-[11px] text-text-subtle text-center py-3">
            Need a couple of check-ins
          </p>
        )}

        {latest !== null && (
          <p className="text-[11px] text-text-muted mt-2 text-right tabular-nums">
            Latest {latest.toFixed(1)} / 10
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function WinRow({
  icon,
  title,
  detail,
}: {
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl bg-surface-muted border border-border/60"
      )}
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="text-xs text-text-muted mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
