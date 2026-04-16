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

export interface DosePoint {
  dose: number;
  improvement: number;
}

type Cannabinoid = "THC" | "CBD" | "CBN" | "CBG";
type Condition =
  | "chronic_pain"
  | "insomnia"
  | "anxiety"
  | "ptsd"
  | "migraine";

const CONDITION_LABELS: Record<Condition, string> = {
  chronic_pain: "Chronic pain",
  insomnia: "Insomnia",
  anxiety: "Anxiety",
  ptsd: "PTSD",
  migraine: "Migraine",
};

const CANNABINOIDS: Cannabinoid[] = ["THC", "CBD", "CBN", "CBG"];
const CONDITIONS: Condition[] = [
  "chronic_pain",
  "insomnia",
  "anxiety",
  "ptsd",
  "migraine",
];

const CANNABINOID_COLORS: Record<Cannabinoid, string> = {
  THC: "#6ea14f",
  CBD: "#2e5b8c",
  CBN: "#7b4fa1",
  CBG: "#b4701e",
};

export function CurvesView({
  data,
  sampleSizes,
}: {
  data: Record<Cannabinoid, Record<Condition, DosePoint[]>>;
  sampleSizes: Record<string, number>;
}) {
  const [cannabinoid, setCannabinoid] = useState<Cannabinoid>("THC");
  const [condition, setCondition] = useState<Condition>("chronic_pain");

  const points = data[cannabinoid][condition];
  const sampleKey = `${cannabinoid}:${condition}`;
  const sampleN = sampleSizes[sampleKey] ?? 0;

  const { optimal, maxDose, maxImprovement } = useMemo(() => {
    let best = points[0];
    let maxD = 0;
    let maxI = 0;
    for (const p of points) {
      if (p.improvement > best.improvement) best = p;
      if (p.dose > maxD) maxD = p.dose;
      if (p.improvement > maxI) maxI = p.improvement;
    }
    return {
      optimal: best,
      maxDose: maxD,
      maxImprovement: Math.max(80, Math.ceil(maxI / 10) * 10),
    };
  }, [points]);

  const W = 720;
  const H = 340;
  const PL = 56;
  const PR = 20;
  const PT = 20;
  const PB = 44;
  const color = CANNABINOID_COLORS[cannabinoid];

  const xAt = (dose: number) =>
    PL + (dose / maxDose) * (W - PL - PR);
  const yAt = (imp: number) =>
    PT + (1 - imp / maxImprovement) * (H - PT - PB);

  // Build a smooth-ish curve: bin into 8 buckets + moving avg.
  const BUCKETS = 10;
  const bucketStep = maxDose / BUCKETS;
  const buckets: { x: number; y: number }[] = [];
  for (let i = 0; i < BUCKETS; i++) {
    const lo = i * bucketStep;
    const hi = (i + 1) * bucketStep;
    const inBucket = points.filter((p) => p.dose >= lo && p.dose < hi);
    if (inBucket.length === 0) continue;
    const avg =
      inBucket.reduce((a, b) => a + b.improvement, 0) / inBucket.length;
    buckets.push({ x: lo + bucketStep / 2, y: avg });
  }
  const curvePath = buckets
    .map((b, i) => `${i === 0 ? "M" : "L"} ${xAt(b.x)},${yAt(b.y)}`)
    .join(" ");

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card tone="raised">
          <CardHeader>
            <CardTitle>Cannabinoid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CANNABINOIDS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCannabinoid(c)}
                  className={cn(
                    "h-9 px-4 rounded-full text-sm font-medium border transition-all",
                    cannabinoid === c
                      ? "text-white border-transparent"
                      : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
                  )}
                  style={{
                    backgroundColor:
                      cannabinoid === c ? CANNABINOID_COLORS[c] : undefined,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardHeader>
            <CardTitle>Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={cn(
                    "h-9 px-4 rounded-full text-sm font-medium border transition-all",
                    condition === c
                      ? "bg-accent text-accent-ink border-accent"
                      : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
                  )}
                >
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>
                {cannabinoid} dose-response · {CONDITION_LABELS[condition]}
              </CardTitle>
              <CardDescription>
                Each dot is one patient's self-reported improvement at their
                stable daily dose.
              </CardDescription>
            </div>
            <Badge tone="neutral">n = {sampleN}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Y grid */}
            {[0, 20, 40, 60, 80].map((t) => (
              <g key={t}>
                <line
                  x1={PL}
                  x2={W - PR}
                  y1={yAt(t)}
                  y2={yAt(t)}
                  stroke="currentColor"
                  className="text-border/50"
                  strokeDasharray={t === 0 ? undefined : "2 3"}
                />
                <text
                  x={PL - 8}
                  y={yAt(t) + 3}
                  className="text-[10px] fill-current text-text-subtle"
                  textAnchor="end"
                >
                  {t}%
                </text>
              </g>
            ))}
            <text
              x={10}
              y={H / 2}
              className="text-[10px] fill-current text-text-subtle"
              transform={`rotate(-90, 10, ${H / 2})`}
              textAnchor="middle"
            >
              Improvement %
            </text>

            {/* X ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line
                  x1={xAt(f * maxDose)}
                  x2={xAt(f * maxDose)}
                  y1={H - PB}
                  y2={H - PB + 4}
                  stroke="currentColor"
                  className="text-border"
                />
                <text
                  x={xAt(f * maxDose)}
                  y={H - PB + 18}
                  className="text-[10px] fill-current text-text-subtle"
                  textAnchor="middle"
                >
                  {(f * maxDose).toFixed(0)} mg
                </text>
              </g>
            ))}
            <text
              x={W / 2}
              y={H - 6}
              className="text-[10px] fill-current text-text-subtle"
              textAnchor="middle"
            >
              Daily {cannabinoid} dose (mg)
            </text>

            {/* Scatter */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={xAt(p.dose)}
                cy={yAt(p.improvement)}
                r={4}
                fill={color}
                fillOpacity={0.35}
                stroke={color}
                strokeWidth={1}
              />
            ))}

            {/* Curve fit */}
            <path
              d={curvePath}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Optimal annotation */}
            <line
              x1={xAt(optimal.dose)}
              x2={xAt(optimal.dose)}
              y1={PT}
              y2={H - PB}
              stroke="#b83b2e"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <circle
              cx={xAt(optimal.dose)}
              cy={yAt(optimal.improvement)}
              r={7}
              fill="#b83b2e"
              stroke="white"
              strokeWidth={2}
            />
            <rect
              x={xAt(optimal.dose) + 8}
              y={yAt(optimal.improvement) - 22}
              width={120}
              height={26}
              rx={4}
              fill="#b83b2e"
            />
            <text
              x={xAt(optimal.dose) + 68}
              y={yAt(optimal.improvement) - 5}
              className="text-[11px] fill-white font-semibold"
              textAnchor="middle"
            >
              Optimal {optimal.dose}mg
            </text>
          </svg>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-surface-muted border border-border">
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                Optimal dose
              </p>
              <p className="font-display text-xl text-text mt-1">
                {optimal.dose} mg/day
              </p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-700 font-medium">
                Max observed improvement
              </p>
              <p className="font-display text-xl text-emerald-900 mt-1">
                {optimal.improvement}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[10px] uppercase tracking-[0.14em] text-amber-700 font-medium">
                Sample size
              </p>
              <p className="font-display text-xl text-amber-900 mt-1">
                n = {sampleN}
              </p>
            </div>
          </div>

          <p className="text-xs text-text-subtle mt-6 leading-relaxed">
            <strong>Disclaimer:</strong> These curves reflect self-reported
            outcomes from a non-randomized, observational cohort. Sample
            sizes &lt; 100 should be interpreted cautiously. Individual
            response varies; start-low-go-slow dosing principles still apply.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
