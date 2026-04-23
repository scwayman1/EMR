"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type Scenario = "conservative" | "base" | "optimistic";

const SCENARIO_MULT: Record<Scenario, number> = {
  conservative: 0.82,
  base: 1.0,
  optimistic: 1.18,
};

const SCENARIOS: Array<{ key: Scenario; label: string }> = [
  { key: "conservative", label: "Conservative" },
  { key: "base", label: "Base" },
  { key: "optimistic", label: "Optimistic" },
];

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function fmtMoney(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000).toLocaleString()}K`;
  return `$${Math.round(amount).toLocaleString()}`;
}

function fmtMoneyPrecise(amount: number) {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function ForecastView() {
  // Demo base numbers
  const [patients, setPatients] = useState(342);
  const [visitsPerYear, setVisitsPerYear] = useState(3.2);
  const [avgVisit, setAvgVisit] = useState(165);
  const [growthPct, setGrowthPct] = useState(4); // monthly patient panel growth %
  const [scenario, setScenario] = useState<Scenario>("base");

  const mult = SCENARIO_MULT[scenario];

  const monthlyVisitsPerPatient = visitsPerYear / 12;

  // Generate 12-month forecast
  const forecast = useMemo(() => {
    const months: Array<{ label: string; revenue: number; patients: number }> = [];
    let panel = patients;
    for (let i = 0; i < 12; i++) {
      const revenue = panel * monthlyVisitsPerPatient * avgVisit * mult;
      months.push({ label: MONTHS[i], revenue, patients: Math.round(panel) });
      panel = panel * (1 + growthPct / 100);
    }
    return months;
  }, [patients, monthlyVisitsPerPatient, avgVisit, mult, growthPct]);

  const projectedMRR = forecast[0].revenue;
  const total12Mo = forecast.reduce((s, m) => s + m.revenue, 0);
  const total30 = forecast[0].revenue;
  const total90 = forecast.slice(0, 3).reduce((s, m) => s + m.revenue, 0);

  // Compute YoY growth (compare last month to first)
  const yoyGrowth = ((forecast[11].revenue - forecast[0].revenue) / forecast[0].revenue) * 100;

  const maxBar = Math.max(...forecast.map((m) => m.revenue));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card tone="ambient">
        <CardContent className="py-8">
          <p className="text-xs uppercase tracking-wider text-text-subtle mb-2">
            Projected MRR · this month
          </p>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="font-display text-5xl text-emerald-700 tabular-nums">
              {fmtMoneyPrecise(projectedMRR)}
            </p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                  yoyGrowth >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700",
                )}
              >
                {yoyGrowth >= 0 ? "▲" : "▼"} {Math.abs(yoyGrowth).toFixed(1)}% YoY
              </span>
              <span className="text-xs text-text-muted">
                12-month total: {fmtMoneyPrecise(total12Mo)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-subtle mr-1">Scenario:</span>
        {SCENARIOS.map((s) => {
          const active = scenario === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setScenario(s.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                active
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-surface text-text-muted border-border hover:bg-surface-muted",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 3 forecast cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ForecastCard label="Next 30 days" amount={total30} />
        <ForecastCard label="Next 90 days" amount={total90} accent />
        <ForecastCard label="Next 12 months" amount={total12Mo} />
      </div>

      {/* Forecast chart */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">12-month projection</CardTitle>
          <CardDescription>Monthly revenue based on current scenario.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-56 border-b border-border pb-2">
            {forecast.map((m, idx) => {
              const heightPct = (m.revenue / maxBar) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-t-md transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                      title={`${m.label}: ${fmtMoneyPrecise(m.revenue)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            {forecast.map((m, idx) => (
              <div key={idx} className="flex-1 text-center text-[10px] text-text-subtle">
                {m.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two columns: assumptions + drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Assumptions</CardTitle>
            <CardDescription>Drivers behind this forecast.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text leading-relaxed">
              Based on{" "}
              <span className="font-medium text-emerald-700">{patients} active patients</span>,{" "}
              <span className="font-medium text-emerald-700">{visitsPerYear.toFixed(1)} visits / patient / year</span>{" "}
              average, and{" "}
              <span className="font-medium text-emerald-700">${avgVisit} per visit</span>.
              Panel growth is modeled at{" "}
              <span className="font-medium text-emerald-700">{growthPct}% / month</span> under the{" "}
              <span className="font-medium capitalize">{scenario}</span> scenario.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="Patients" value={patients.toString()} />
              <Stat label="Visits / yr" value={visitsPerYear.toFixed(1)} />
              <Stat label="Avg ticket" value={`$${avgVisit}`} />
            </div>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Key drivers</CardTitle>
            <CardDescription>Adjust to model your forecast in real time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Slider
              label="Patient panel"
              value={patients}
              min={50}
              max={2000}
              step={10}
              onChange={setPatients}
              format={(v) => `${v} patients`}
            />
            <Slider
              label="Avg visits / patient / year"
              value={visitsPerYear}
              min={1}
              max={12}
              step={0.1}
              onChange={setVisitsPerYear}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Avg revenue per visit"
              value={avgVisit}
              min={50}
              max={500}
              step={5}
              onChange={setAvgVisit}
              format={(v) => `$${v}`}
            />
            <Slider
              label="Monthly panel growth"
              value={growthPct}
              min={0}
              max={15}
              step={0.5}
              onChange={setGrowthPct}
              format={(v) => `${v}%`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ForecastCard({ label, amount, accent }: { label: string; amount: number; accent?: boolean }) {
  return (
    <Card tone={accent ? "ambient" : "raised"}>
      <CardContent className="py-5">
        <p className="text-xs uppercase tracking-wider text-text-subtle">{label}</p>
        <p
          className={cn(
            "font-display text-3xl tabular-nums mt-2",
            accent ? "text-emerald-700" : "text-text",
          )}
        >
          {fmtMoney(amount)}
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-muted/60 py-3">
      <p className="text-lg font-display tabular-nums text-text">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-text-subtle mt-1">{label}</p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        <span className="text-sm font-medium text-emerald-700 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-700"
      />
      <div className="flex justify-between text-[10px] text-text-subtle mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
