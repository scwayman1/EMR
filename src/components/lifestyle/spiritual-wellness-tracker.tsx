"use client";

/**
 * Spiritual Wellness tracker — EMR-095
 *
 * Five-row weekly check-in. Tap +/− to adjust the count for each
 * sub-domain. Persists per (patient, ISO week) in localStorage so we
 * can move it to a server-backed model later without touching the UI.
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  SPIRITUAL_SUBDOMAINS,
  emptyWeek,
  isoWeekKey,
  spiritualScore,
  spiritualStorageKey,
  type SpiritualSubdomain,
  type SpiritualWeekEntry,
} from "@/lib/domain/spiritual-wellness";

interface Props {
  patientId: string;
  /** Override the week key — handy for tests or "view past week" UI. */
  weekKey?: string;
}

export function SpiritualWellnessTracker({ patientId, weekKey }: Props) {
  const week = weekKey ?? isoWeekKey();
  const storageKey = spiritualStorageKey(patientId, week);

  const [entry, setEntry] = React.useState<SpiritualWeekEntry>(() =>
    emptyWeek(week),
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setEntry(JSON.parse(raw) as SpiritualWeekEntry);
    } catch {
      /* ignore malformed cache */
    }
    setHydrated(true);
  }, [storageKey]);

  const persist = (next: SpiritualWeekEntry) => {
    setEntry(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  };

  const adjust = (id: SpiritualSubdomain, delta: number) => {
    const nextCount = Math.max(0, (entry.counts[id] ?? 0) + delta);
    persist({
      ...entry,
      counts: { ...entry.counts, [id]: nextCount },
      updatedAt: new Date().toISOString(),
    });
  };

  const score = spiritualScore(entry);

  if (!hydrated) return null;

  return (
    <Card tone="raised" className="overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-subtle">
            This week — {week}
          </p>
          <h3 className="font-display text-xl text-text mt-1">
            Spiritual wellness check-in
          </h3>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-accent">{score}</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">
            Pillar score
          </p>
        </div>
      </div>

      <CardContent className="pb-5">
        <ul className="divide-y divide-border/60">
          {SPIRITUAL_SUBDOMAINS.map((s) => {
            const count = entry.counts[s.id] ?? 0;
            const ratio = Math.min(1, count / Math.max(1, s.weeklyTarget));
            return (
              <li
                key={s.id}
                className="flex items-center gap-4 py-3"
                data-subdomain={s.id}
              >
                <span
                  role="img"
                  aria-label={s.label}
                  className="text-2xl shrink-0"
                >
                  {s.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{s.label}</p>
                  <p className="text-xs text-text-subtle">{s.description}</p>
                  <div
                    className="mt-2 h-1.5 rounded-full bg-surface-muted overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Decrease ${s.label}`}
                    onClick={() => adjust(s.id, -1)}
                    disabled={count === 0}
                  >
                    −
                  </Button>
                  <div className="w-14 text-center">
                    <p className="font-display text-lg text-text leading-none">
                      {count}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                      / {s.weeklyTarget} {s.unit}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    aria-label={`Increase ${s.label}`}
                    onClick={() => adjust(s.id, 1)}
                  >
                    +
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
