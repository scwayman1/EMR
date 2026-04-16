"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface ScheduledDose {
  id: string;
  regimenId: string;
  productName: string;
  productBrand: string | null;
  hour: number; // 0-24
  volumeText: string;
  thcPerDose: number | null;
  cbdPerDose: number | null;
  timingInstructions: string | null;
  colorIndex: number;
}

const HOUR_MARKERS = [6, 9, 12, 15, 18, 21, 24];

const PALETTE = [
  "from-emerald-500 to-emerald-600",
  "from-amber-500 to-amber-600",
  "from-indigo-500 to-indigo-600",
  "from-rose-500 to-rose-600",
  "from-teal-500 to-teal-600",
  "from-violet-500 to-violet-600",
  "from-sky-500 to-sky-600",
  "from-orange-500 to-orange-600",
];

function formatClock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour - Math.floor(hour)) * 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const display = ((h + 11) % 12) + 1;
  return `${display}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

interface Props {
  doses: ScheduledDose[];
}

export function ScheduleView({ doses }: Props) {
  const [now, setNow] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const d = new Date();
      setNow(d.getHours() + d.getMinutes() / 60);
    }
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  // Group by regimen for the legend
  const legend = useMemo(() => {
    const seen = new Map<string, { name: string; brand: string | null; colorIndex: number }>();
    for (const d of doses) {
      if (!seen.has(d.regimenId)) {
        seen.set(d.regimenId, {
          name: d.productName,
          brand: d.productBrand,
          colorIndex: d.colorIndex,
        });
      }
    }
    return Array.from(seen.entries()).map(([regimenId, v]) => ({ regimenId, ...v }));
  }, [doses]);

  return (
    <div className="space-y-6">
      {/* Timeline card */}
      <div className="rounded-2xl bg-surface-raised border border-border shadow-md p-5 sm:p-8 overflow-x-auto">
        <div className="relative min-w-[640px]">
          {/* Current time indicator */}
          {now !== null && (
            <div
              className="absolute top-0 bottom-8 w-px bg-rose-500/80 z-10"
              style={{ left: `${(now / 24) * 100}%` }}
              aria-hidden="true"
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500 text-white whitespace-nowrap">
                {formatClock(now)}
              </span>
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-rose-500" />
            </div>
          )}

          {/* Pill track */}
          <div className="relative h-16 mt-6">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-surface-muted border border-border/70" />

            {doses.map((d) => {
              const left = (d.hour / 24) * 100;
              const color = PALETTE[d.colorIndex % PALETTE.length];
              const hovered = hoveredId === d.id;
              return (
                <div
                  key={d.id}
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${left}%` }}
                  onMouseEnter={() => setHoveredId(d.id)}
                  onMouseLeave={() => setHoveredId((v) => (v === d.id ? null : v))}
                  onFocus={() => setHoveredId(d.id)}
                  onBlur={() => setHoveredId((v) => (v === d.id ? null : v))}
                >
                  <button
                    type="button"
                    aria-label={`${d.productName} at ${formatClock(d.hour)}`}
                    className={cn(
                      "relative flex items-center justify-center rounded-full",
                      "h-8 w-8 -translate-x-1/2 text-white text-[11px] font-semibold",
                      "bg-gradient-to-br shadow-md border-2 border-surface",
                      "transition-transform duration-200 hover:scale-110 focus-visible:scale-110",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                      color
                    )}
                  >
                    {d.productName[0]?.toUpperCase() ?? "•"}
                  </button>

                  {hovered && (
                    <div className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[180px] rounded-lg bg-text text-surface text-xs p-2.5 shadow-xl pointer-events-none">
                      <p className="font-semibold">{d.productName}</p>
                      {d.productBrand && (
                        <p className="text-surface/80">{d.productBrand}</p>
                      )}
                      <p className="mt-1">
                        <span className="font-medium">{formatClock(d.hour)}</span>
                        {" · "}
                        {d.volumeText}
                      </p>
                      {(d.thcPerDose !== null || d.cbdPerDose !== null) && (
                        <p className="text-surface/80 mt-0.5">
                          {d.thcPerDose !== null && `${d.thcPerDose.toFixed(1)}mg THC`}
                          {d.thcPerDose !== null && d.cbdPerDose !== null && " · "}
                          {d.cbdPerDose !== null && `${d.cbdPerDose.toFixed(1)}mg CBD`}
                        </p>
                      )}
                      {d.timingInstructions && (
                        <p className="text-surface/80 mt-1 italic">
                          {d.timingInstructions}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hour axis */}
          <div className="relative h-8 mt-2">
            {HOUR_MARKERS.map((h) => (
              <div
                key={h}
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${(h / 24) * 100}%` }}
              >
                <div className="h-2 w-px bg-border-strong/60 mx-auto" />
                <span className="block mt-1 text-[10px] font-medium text-text-subtle whitespace-nowrap">
                  {formatHourLabel(h)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      {legend.length > 0 && (
        <div className="rounded-2xl bg-surface border border-border p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
            Products
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {legend.map((item) => (
              <li key={item.regimenId} className="flex items-center gap-2 text-sm text-text">
                <span
                  className={cn(
                    "h-4 w-4 rounded-full bg-gradient-to-br shrink-0",
                    PALETTE[item.colorIndex % PALETTE.length]
                  )}
                  aria-hidden="true"
                />
                <span className="font-medium">{item.name}</span>
                {item.brand && <span className="text-text-subtle text-xs">· {item.brand}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
