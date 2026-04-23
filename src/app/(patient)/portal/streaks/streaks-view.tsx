"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { ACHIEVEMENTS, TIER_COLORS, type Achievement } from "@/lib/domain/streaks";

export interface StreaksData {
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
  last30: { date: string; logged: boolean }[];
}

const TIER_ORDER: Record<Achievement["tier"], number> = {
  platinum: 0,
  gold: 1,
  silver: 2,
  bronze: 3,
};

export function StreaksView({ data }: { data: StreaksData }) {
  const fire = data.currentStreak >= 7 ? "🔥" : "🌱";

  // Derive unlocks: dose_log + outcome_check both unlock from currentStreak;
  // journal/assessment we just check vs. totalDaysLogged as a stand-in.
  function isUnlocked(a: Achievement): boolean {
    if (a.streakType === "dose_log") return data.currentStreak >= a.threshold;
    if (a.streakType === "outcome_check") return data.totalDaysLogged >= a.threshold;
    return data.totalDaysLogged >= a.threshold;
  }

  function progressToward(a: Achievement): number {
    const have =
      a.streakType === "dose_log" ? data.currentStreak : data.totalDaysLogged;
    return Math.max(0, a.threshold - have);
  }

  const sortedAchievements = [...ACHIEVEMENTS]
    .sort((a, b) => {
      const ua = isUnlocked(a);
      const ub = isUnlocked(b);
      if (ua !== ub) return ua ? -1 : 1; // unlocked first
      return TIER_ORDER[a.tier] - TIER_ORDER[b.tier]; // platinum -> bronze
    })
    .slice(0, 9);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Card tone="ambient" className="rounded-2xl">
        <CardContent className="py-12 px-8 text-center">
          <span className="text-6xl block mb-3">{fire}</span>
          <p className="font-display text-7xl text-text tracking-tight tabular-nums leading-none">
            {data.currentStreak}
          </p>
          <p className="font-display text-xl text-text mt-3">
            day streak!
          </p>
          <p className="text-sm text-text-muted mt-2">
            Longest ever: <span className="font-semibold text-text">{data.longestStreak}</span> days
          </p>
        </CardContent>
      </Card>

      {/* CALENDAR */}
      <Card className="rounded-2xl">
        <CardContent className="py-7 px-7">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display text-lg text-text tracking-tight">
              Last 30 days
            </p>
            <Badge tone="neutral">
              {data.last30.filter((d) => d.logged).length} / 30 logged
            </Badge>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {data.last30.map((day) => (
              <div
                key={day.date}
                title={`${day.date}${day.logged ? " — logged" : ""}`}
                className={cn(
                  "aspect-square rounded-md transition-all",
                  day.logged
                    ? "bg-gradient-to-br from-accent/70 to-accent shadow-sm"
                    : "bg-surface-muted border border-border/50"
                )}
              />
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[11px] text-text-subtle">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      {/* MOTIVATIONAL */}
      <Card className="rounded-2xl bg-accent-soft/40">
        <CardContent className="py-6 px-6 flex items-center gap-4">
          <span className="text-4xl shrink-0">💚</span>
          <p className="text-sm text-text leading-relaxed">
            Every day you log, you help us understand what works — for you, and
            for the next patient like you.
          </p>
        </CardContent>
      </Card>

      {/* ACHIEVEMENTS */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏅</span>
          <h2 className="font-display text-xl text-text tracking-tight">
            Achievements
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAchievements.map((a) => {
            const unlocked = isUnlocked(a);
            const remaining = progressToward(a);
            return (
              <div
                key={a.id}
                className={cn(
                  "rounded-2xl border-2 p-5 transition-all",
                  unlocked
                    ? "bg-surface shadow-sm"
                    : "bg-surface-muted/60 border-dashed",
                  unlocked && "border-current",
                  unlocked && TIER_COLORS[a.tier]
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span
                    className={cn(
                      "text-4xl",
                      !unlocked && "grayscale opacity-50"
                    )}
                  >
                    {unlocked ? a.emoji : "🔒"}
                  </span>
                  <Badge
                    tone={
                      a.tier === "platinum"
                        ? "highlight"
                        : a.tier === "gold"
                        ? "warning"
                        : a.tier === "silver"
                        ? "neutral"
                        : "warning"
                    }
                    className="capitalize"
                  >
                    {a.tier}
                  </Badge>
                </div>
                <p
                  className={cn(
                    "font-display text-base tracking-tight",
                    unlocked ? "text-text" : "text-text-muted"
                  )}
                >
                  {a.title}
                </p>
                <p
                  className={cn(
                    "text-xs mt-1 leading-snug",
                    unlocked ? "text-text-muted" : "text-text-subtle"
                  )}
                >
                  {a.description}
                </p>
                {!unlocked && (
                  <p className="text-[11px] text-text-subtle mt-3 font-medium">
                    Log {remaining} more day{remaining === 1 ? "" : "s"}
                  </p>
                )}
                {unlocked && (
                  <p className="text-[11px] mt-3 font-semibold opacity-80">
                    ✓ Unlocked
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
