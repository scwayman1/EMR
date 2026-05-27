// EMR-056 — Comprehensive Product + Dosing Recommendation Engine (UI).
//
// Clinician-facing view that drives `lib/prescribing/recommendation-engine`.
// Pick symptoms + tolerance + optional form preference, get a ranked list
// of products with cannabinoid ratio, evidence tier, and a tolerance-keyed
// dose window. Form submits via querystring so the page stays server-rendered
// and the recommendation surface stays auditable.

import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  recommend,
  type EvidenceTier,
  type RecommendationInput,
  type SymptomKey,
  type ToleranceBand,
} from "@/lib/prescribing/recommendation-engine";

export const metadata = { title: "Recommendation engine" };

const SYMPTOM_OPTIONS: { value: SymptomKey; label: string }[] = [
  { value: "chronic_pain", label: "Chronic pain" },
  { value: "neuropathic_pain", label: "Neuropathic pain" },
  { value: "anxiety", label: "Anxiety" },
  { value: "ptsd", label: "PTSD" },
  { value: "insomnia", label: "Insomnia" },
  { value: "nausea", label: "Nausea" },
  { value: "appetite_loss", label: "Appetite loss" },
  { value: "spasticity", label: "Spasticity (MS)" },
  { value: "seizure", label: "Seizure" },
  { value: "depression", label: "Depression" },
  { value: "inflammation", label: "Inflammation" },
];

const TOLERANCE_OPTIONS: { value: ToleranceBand; label: string }[] = [
  { value: "naive", label: "Cannabis naive" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High / experienced" },
];

const FORM_OPTIONS = [
  { value: "tincture", label: "Tincture" },
  { value: "softgel", label: "Softgel" },
  { value: "edible", label: "Edible" },
  { value: "sublingual", label: "Sublingual spray" },
  { value: "inhaled", label: "Inhaled / vaporized" },
  { value: "topical", label: "Topical" },
];

const EVIDENCE_TONES: Record<EvidenceTier, "success" | "info" | "neutral" | "warning"> = {
  rct: "success",
  meta_analysis: "success",
  observational: "info",
  pro: "info",
  experiential: "neutral",
};

function parseSymptoms(raw: string | undefined): SymptomKey[] {
  if (!raw) return [];
  const allowed = new Set(SYMPTOM_OPTIONS.map((o) => o.value));
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SymptomKey => allowed.has(s as SymptomKey));
}

function parseTolerance(raw: string | undefined): ToleranceBand {
  const allowed = new Set(TOLERANCE_OPTIONS.map((o) => o.value));
  return allowed.has(raw as ToleranceBand) ? (raw as ToleranceBand) : "moderate";
}

export default function RecommendationsPage({
  searchParams,
}: {
  searchParams: {
    symptoms?: string;
    tolerance?: string;
    form?: string;
    thcCeiling?: string;
    cbdFloor?: string;
  };
}) {
  const symptoms = parseSymptoms(searchParams.symptoms);
  const tolerance = parseTolerance(searchParams.tolerance);
  const thcCeiling = searchParams.thcCeiling
    ? Number(searchParams.thcCeiling)
    : undefined;
  const cbdFloor = searchParams.cbdFloor ? Number(searchParams.cbdFloor) : undefined;
  const preferredForm =
    searchParams.form && FORM_OPTIONS.some((f) => f.value === searchParams.form)
      ? (searchParams.form as RecommendationInput["preferredForm"])
      : undefined;

  const input: RecommendationInput = {
    symptoms,
    tolerance,
    preferredForm,
    thcCeiling,
    cbdFloor,
  };
  const results = recommend(input);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Prescribing"
        title="Recommendation engine"
        description="Cross-references the patient's symptom + tolerance profile against the full cannabinoid corpus — RCTs, observational studies, patient outcomes, and canonical book references. Returns ranked products with cannabinoid ratio, dominant terpene, and a tolerance-keyed dose window."
      />

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>1 · Patient profile</CardTitle>
          <CardDescription>
            Pick the symptoms you&apos;re targeting and the patient&apos;s tolerance band. Form
            preference and THC ceiling are optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/clinic/recommendations" method="get" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-2">
                Symptoms (pick one or more)
              </p>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_OPTIONS.map((s) => {
                  const isOn = symptoms.includes(s.value);
                  const next = isOn
                    ? symptoms.filter((x) => x !== s.value)
                    : [...symptoms, s.value];
                  const params = new URLSearchParams();
                  if (next.length) params.set("symptoms", next.join(","));
                  if (tolerance) params.set("tolerance", tolerance);
                  if (preferredForm) params.set("form", preferredForm);
                  if (thcCeiling !== undefined) params.set("thcCeiling", String(thcCeiling));
                  if (cbdFloor !== undefined) params.set("cbdFloor", String(cbdFloor));
                  return (
                    <Link
                      key={s.value}
                      href={`/clinic/recommendations?${params.toString()}`}
                      className={[
                        "px-3 py-1.5 rounded-full text-sm border transition-colors",
                        isOn
                          ? "bg-accent text-accent-ink border-accent"
                          : "bg-surface border-border text-text-muted hover:text-text",
                      ].join(" ")}
                    >
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* preserve symptoms inside the form-submit branch */}
            <input type="hidden" name="symptoms" value={symptoms.join(",")} />

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-subtle uppercase tracking-wider">
                Tolerance
              </span>
              <select
                name="tolerance"
                defaultValue={tolerance}
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
              >
                {TOLERANCE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-subtle uppercase tracking-wider">
                Preferred form (optional)
              </span>
              <select
                name="form"
                defaultValue={preferredForm ?? ""}
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">No preference</option>
                {FORM_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-subtle uppercase tracking-wider">
                THC ceiling %
              </span>
              <input
                name="thcCeiling"
                type="number"
                step="1"
                min="0"
                max="35"
                defaultValue={thcCeiling ?? ""}
                placeholder="22"
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-subtle uppercase tracking-wider">
                CBD floor %
              </span>
              <input
                name="cbdFloor"
                type="number"
                step="1"
                min="0"
                max="100"
                defaultValue={cbdFloor ?? ""}
                placeholder="—"
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent/90"
              >
                Recompute recommendations →
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Symptoms" value={String(symptoms.length)} size="md" />
        <StatCard label="Candidates" value={String(results.length)} size="md" tone="info" />
        <StatCard
          label="Top score"
          value={results[0]?.score.toString() ?? "—"}
          size="md"
          tone="success"
        />
        <StatCard label="Tolerance" value={tolerance} size="md" tone="neutral" />
      </div>

      {symptoms.length === 0 ? (
        <Card tone="outlined">
          <CardContent className="py-12 text-center">
            <p className="text-text-muted">
              Select at least one symptom above to see ranked recommendations.
            </p>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card tone="outlined">
          <CardContent className="py-12 text-center">
            <p className="text-text-muted">
              No candidates passed the filter. Loosen the THC ceiling or pick a different
              symptom.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {results.map((r) => (
            <Card key={r.product.id} tone="raised">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{r.product.name}</CardTitle>
                    <CardDescription>
                      {r.product.form} · ratio {r.cannabinoidRatio}
                      {r.product.dominantTerpene
                        ? ` · ${r.product.dominantTerpene}`
                        : ""}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge tone={EVIDENCE_TONES[r.product.evidenceTier]}>
                      {r.product.evidenceTier.replace("_", " ")}
                    </Badge>
                    <span className="text-xs tabular-nums text-text-muted">
                      score {r.score}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-surface-muted border border-border/60 px-3 py-2 mb-3 text-sm">
                  <p className="text-text font-medium">
                    Start {r.dose.startMg}mg → ceiling {r.dose.ceilingMg}mg
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">
                    Interval {r.dose.intervalHours[0]}
                    {r.dose.intervalHours[1] !== r.dose.intervalHours[0]
                      ? `–${r.dose.intervalHours[1]}`
                      : ""}
                    h · titrate every 3–5 days as tolerated
                  </p>
                </div>

                {r.matchedSymptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {r.matchedSymptoms.map((s) => (
                      <Badge key={s} tone="accent">
                        {s.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                )}

                <ul className="text-sm text-text-muted space-y-1 mb-3">
                  {r.reasons.map((reason, i) => (
                    <li key={i}>· {reason}</li>
                  ))}
                </ul>

                {r.warnings.length > 0 && (
                  <ul className="text-sm space-y-1 mb-3">
                    {r.warnings.map((w, i) => (
                      <li key={i} className="text-[color:var(--warning)]">
                        ⚠ {w}
                      </li>
                    ))}
                  </ul>
                )}

                {r.product.citations.length > 0 && (
                  <p className="text-[11px] text-text-subtle font-mono mt-2">
                    cites: {r.product.citations.join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
