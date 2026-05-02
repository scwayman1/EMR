"use client";

import { useMemo, useState, useTransition } from "react";
import {
  COMPETITORS,
  TIERS,
  formatUsd,
  type RoiInput,
  type RoiResult,
} from "@/lib/billing/subscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeRoiAction, startCheckoutAction } from "./actions";

export function RoiCalculator() {
  const [providerCount, setProviderCount] = useState(5);
  const [tierId, setTierId] = useState<RoiInput["tierId"]>("growth");
  const [competitorId, setCompetitorId] = useState<RoiInput["competitorId"]>("epic");
  const [billingCycle, setBillingCycle] = useState<RoiInput["billingCycle"]>("annual");
  const [hoursSaved, setHoursSaved] = useState(2_000);
  const [laborRate, setLaborRate] = useState(45);
  const [result, setResult] = useState<RoiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const input = useMemo<RoiInput>(
    () => ({
      providerCount,
      tierId,
      competitorId,
      billingCycle,
      estimatedHoursSavedPerYear: hoursSaved,
      laborRateUsdPerHour: laborRate,
    }),
    [providerCount, tierId, competitorId, billingCycle, hoursSaved, laborRate],
  );

  function recalc() {
    setError(null);
    startTransition(async () => {
      const res = await computeRoiAction(input);
      if (res.ok) setResult(res.result);
      else setError(res.error);
    });
  }

  function startCheckout() {
    startTransition(async () => {
      const res = await startCheckoutAction({ tierId, billingCycle, providerCount });
      if (!res.ok) setError(res.error);
      else if (typeof window !== "undefined") {
        window.location.href = res.checkoutUrl;
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Calculator inputs</CardTitle>
          <CardDescription>
            Tune providers, tier, competitor, and labor savings to model ROI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Provider count">
            <Input
              type="number"
              min={1}
              max={500}
              value={providerCount}
              onChange={(e) => setProviderCount(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Leafjourney tier">
            <select
              value={tierId}
              onChange={(e) => setTierId(e.target.value as RoiInput["tierId"])}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {TIERS.filter((t) => t.id !== "enterprise").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {formatUsd(t.monthlyUsdPerProvider)}/mo
                </option>
              ))}
            </select>
          </Field>
          <Field label="Compare against">
            <select
              value={competitorId}
              onChange={(e) => setCompetitorId(e.target.value as RoiInput["competitorId"])}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {COMPETITORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Billing cycle">
            <div className="flex rounded-md border border-border overflow-hidden">
              {(["monthly", "annual"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBillingCycle(c)}
                  className={`flex-1 px-3 py-2 text-sm capitalize transition-colors ${
                    billingCycle === c
                      ? "bg-accent text-white"
                      : "bg-surface text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Staff hours saved per year (agent automation)">
            <Input
              type="number"
              min={0}
              max={50_000}
              value={hoursSaved}
              onChange={(e) => setHoursSaved(Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>
          <Field label="Loaded labor rate (USD / hour)">
            <Input
              type="number"
              min={15}
              max={500}
              value={laborRate}
              onChange={(e) => setLaborRate(Math.max(15, Number(e.target.value) || 45))}
            />
          </Field>
          <div className="flex gap-2">
            <Button onClick={recalc} disabled={isPending}>
              {isPending ? "Calculating…" : "Calculate ROI"}
            </Button>
            <Button onClick={startCheckout} variant="secondary" disabled={isPending}>
              Start checkout
            </Button>
          </div>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Year-1 includes competitor implementation; steady-state is annual subscription delta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-text-muted">
              Tune inputs on the left and click <strong>Calculate ROI</strong> to see the result.
            </p>
          ) : (
            <dl className="space-y-3 text-sm">
              <Row label="Leafjourney annual" value={formatUsd(result.leafjourneyAnnualUsd)} />
              <Row label="Competitor annual" value={formatUsd(result.competitorAnnualUsd)} />
              <Row
                label="Competitor implementation"
                value={formatUsd(result.competitorImplementationUsd)}
              />
              <Row
                label="Labor savings (agents)"
                value={formatUsd(result.laborSavingsUsd)}
                positive
              />
              <hr className="border-border/70 my-2" />
              <Row
                label="Year-1 savings"
                value={formatUsd(result.yearOneSavingsUsd)}
                positive={result.yearOneSavingsUsd >= 0}
                emphasize
              />
              <Row
                label="Steady-state savings (yr 2+)"
                value={formatUsd(result.steadyStateSavingsUsd)}
                positive={result.steadyStateSavingsUsd >= 0}
              />
              <Row
                label="3-year delta"
                value={formatUsd(result.threeYearDeltaUsd)}
                positive={result.threeYearDeltaUsd >= 0}
                emphasize
              />
              <Row label="Payback (months)" value={`${result.paybackMonths} mo`} />
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.12em] text-text-subtle mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  emphasize,
}: {
  label: string;
  value: string;
  positive?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-muted">{label}</dt>
      <dd
        className={`tabular-nums ${emphasize ? "font-display text-base" : ""} ${
          positive === true ? "text-success" : positive === false ? "text-danger" : "text-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
