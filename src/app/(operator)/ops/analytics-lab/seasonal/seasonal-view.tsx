"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export interface MetricSeries {
  label: string;
  emoji: string;
  color: string;
  fill: string;
  values: number[]; // 12 entries, Jan-Dec
  invertedBetter: boolean; // true = lower is better
  commentary: string;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function SeasonalView({ series }: { series: Record<string, MetricSeries> }) {
  const metricKeys = Object.keys(series);
  const [metric, setMetric] = useState<string>(metricKeys[0]);

  const s = series[metric];

  const { peakIdx, troughIdx, min, max } = useMemo(() => {
    let peakIdx = 0;
    let troughIdx = 0;
    let mx = -Infinity;
    let mn = Infinity;
    s.values.forEach((v, i) => {
      if (v > mx) {
        mx = v;
        peakIdx = i;
      }
      if (v < mn) {
        mn = v;
        troughIdx = i;
      }
    });
    return { peakIdx, troughIdx, min: mn, max: mx };
  }, [s]);

  // Build SVG polyline points (width 720, height 220, padding 40 left/24 right, 20 top/40 bottom).
  const W = 720;
  const H = 220;
  const PL = 40;
  const PR = 24;
  const PT = 20;
  const PB = 40;
  const xStep = (W - PL - PR) / 11;
  const yMin = 0;
  const yMax = 10;
  const yScale = (v: number) => PT + ((yMax - v) / (yMax - yMin)) * (H - PT - PB);
  const xAt = (i: number) => PL + i * xStep;

  const linePoints = s.values.map((v, i) => `${xAt(i)},${yScale(v)}`).join(" ");
  const areaPath =
    `M ${xAt(0)},${H - PB} ` +
    s.values.map((v, i) => `L ${xAt(i)},${yScale(v)}`).join(" ") +
    ` L ${xAt(11)},${H - PB} Z`;

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {metricKeys.map((k) => (
          <button
            key={k}
            onClick={() => setMetric(k)}
            className={cn(
              "h-9 px-4 rounded-full text-sm font-medium border transition-all",
              metric === k
                ? "bg-accent text-accent-ink border-accent"
                : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
            )}
          >
            <span className="mr-1.5">{series[k].emoji}</span>
            {series[k].label}
          </button>
        ))}
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{s.emoji}</span>
            {s.label} by month
          </CardTitle>
          <CardDescription>
            Y-axis: average 0-10 score. {s.invertedBetter ? "Lower is better." : "Higher is better."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Horizontal grid */}
            {[0, 2, 4, 6, 8, 10].map((tick) => (
              <g key={tick}>
                <line
                  x1={PL}
                  x2={W - PR}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                  stroke="currentColor"
                  className="text-border/50"
                  strokeDasharray={tick === 0 ? undefined : "2 3"}
                />
                <text
                  x={PL - 8}
                  y={yScale(tick) + 3}
                  className="text-[10px] fill-current text-text-subtle"
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Area */}
            <path d={areaPath} fill={s.fill} stroke="none" />
            {/* Line */}
            <polyline
              points={linePoints}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points + month labels */}
            {s.values.map((v, i) => (
              <g key={i}>
                <circle
                  cx={xAt(i)}
                  cy={yScale(v)}
                  r={i === peakIdx || i === troughIdx ? 5 : 3}
                  fill={s.color}
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={xAt(i)}
                  y={H - PB + 18}
                  className="text-[11px] fill-current text-text-muted"
                  textAnchor="middle"
                >
                  {MONTHS[i]}
                </text>
              </g>
            ))}

            {/* Peak annotation */}
            <text
              x={xAt(peakIdx)}
              y={yScale(max) - 10}
              className="text-[10px] font-semibold fill-current text-red-600"
              textAnchor="middle"
            >
              peak {max.toFixed(1)}
            </text>
            <text
              x={xAt(troughIdx)}
              y={yScale(min) + 16}
              className="text-[10px] font-semibold fill-current text-emerald-600"
              textAnchor="middle"
            >
              trough {min.toFixed(1)}
            </text>
          </svg>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-[10px] uppercase tracking-[0.14em] text-red-700 font-medium">
                Seasonal peak
              </p>
              <p className="font-display text-xl text-red-900 mt-1">
                {MONTHS[peakIdx]} · {max.toFixed(1)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-700 font-medium">
                Seasonal trough
              </p>
              <p className="font-display text-xl text-emerald-900 mt-1">
                {MONTHS[troughIdx]} · {min.toFixed(1)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-surface-muted border border-border">
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                Amplitude
              </p>
              <p className="font-display text-xl text-text mt-1">
                {(max - min).toFixed(1)} pts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge tone="accent">Insight</Badge>
            Commentary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text leading-relaxed">{s.commentary}</p>
        </CardContent>
      </Card>
    </>
  );
}
