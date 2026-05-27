// EMR-097 — Data research & reports module (builder)
//
// Interactive builder on top of the existing research-export pipeline.
// The operator picks a scope, dimensions, date range, and small-cell
// threshold; the page renders a live preview of the de-identified
// cohort plus the manifest that would ship with the export.

import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CohortPseudonymizer,
  buildCohortManifest,
  categorizePayer,
  deIdentifyPatient,
  deIdentifyClaim,
  suppressSmallCells,
  type RawPatientFacts,
  type RawClaimFacts,
  type ResearchScope,
} from "@/lib/billing/research-export";

export const metadata = { title: "Research export builder" };

const BUILDER_SALT = "builder_demo_2026__cohort_salt_at_least_16_chars";

const RAW_PATIENTS: RawPatientFacts[] = [
  { patientId: "p1", dateOfBirth: new Date("1957-08-12"), sex: "female", race: "Black or African American", ethnicity: "Non-Hispanic", smokingStatus: "former", substanceHistory: null, zipCode: "80302", socioeconomicTier: "middle" },
  { patientId: "p2", dateOfBirth: new Date("1971-02-22"), sex: "male", race: "White", ethnicity: "Non-Hispanic", smokingStatus: "never", substanceHistory: "occasional alcohol", zipCode: "80303", socioeconomicTier: "middle" },
  { patientId: "p3", dateOfBirth: new Date("1986-11-30"), sex: "female", race: "Asian", ethnicity: "Non-Hispanic", smokingStatus: "never", substanceHistory: null, zipCode: "80305", socioeconomicTier: "upper" },
  { patientId: "p4", dateOfBirth: new Date("1992-04-04"), sex: "male", race: "White", ethnicity: "Hispanic", smokingStatus: "current", substanceHistory: "cannabis daily", zipCode: "80301", socioeconomicTier: "lower" },
  { patientId: "p5", dateOfBirth: new Date("1934-09-09"), sex: "female", race: "White", ethnicity: "Non-Hispanic", smokingStatus: "former", substanceHistory: null, zipCode: "03601", socioeconomicTier: "lower" },
  { patientId: "p6", dateOfBirth: new Date("1968-01-15"), sex: "male", race: "Asian", ethnicity: "Non-Hispanic", smokingStatus: "former", substanceHistory: null, zipCode: "80301", socioeconomicTier: "middle" },
  { patientId: "p7", dateOfBirth: new Date("1981-06-21"), sex: "female", race: "White", ethnicity: "Non-Hispanic", smokingStatus: "never", substanceHistory: null, zipCode: "80304", socioeconomicTier: "upper" },
];

const RAW_CLAIMS: RawClaimFacts[] = [
  { claimId: "c1", patientId: "p1", encounterId: "e1", serviceDate: new Date("2026-03-14"), payerName: "Medicare", cptCodes: ["99214", "99454"], icd10Codes: ["I10", "G89.4"], billedCents: 38000, paidCents: 26500, patientRespCents: 6000, status: "paid", denialCategory: null },
  { claimId: "c2", patientId: "p2", encounterId: "e2", serviceDate: new Date("2026-03-22"), payerName: "Aetna", cptCodes: ["99213"], icd10Codes: ["F41.1"], billedCents: 18500, paidCents: 11800, patientRespCents: 2900, status: "paid", denialCategory: null },
  { claimId: "c3", patientId: "p3", encounterId: "e3", serviceDate: new Date("2026-04-04"), payerName: "Self pay", cptCodes: ["99204"], icd10Codes: ["F12.10"], billedCents: 30000, paidCents: 30000, patientRespCents: 0, status: "paid", denialCategory: null },
  { claimId: "c4", patientId: "p4", encounterId: "e4", serviceDate: new Date("2026-04-12"), payerName: "Medicaid", cptCodes: ["99214"], icd10Codes: ["F12.10", "M54.5"], billedCents: 22000, paidCents: 0, patientRespCents: 0, status: "denied", denialCategory: "non_covered_service" },
  { claimId: "c5", patientId: "p5", encounterId: "e5", serviceDate: new Date("2026-04-22"), payerName: "Medicare", cptCodes: ["99457", "99458"], icd10Codes: ["I10"], billedCents: 14500, paidCents: 11200, patientRespCents: 0, status: "paid", denialCategory: null },
  { claimId: "c6", patientId: "p6", encounterId: "e6", serviceDate: new Date("2026-02-18"), payerName: "BCBS", cptCodes: ["99213"], icd10Codes: ["G47.00"], billedCents: 16500, paidCents: 10200, patientRespCents: 2200, status: "paid", denialCategory: null },
  { claimId: "c7", patientId: "p7", encounterId: "e7", serviceDate: new Date("2026-04-10"), payerName: "Cigna", cptCodes: ["99214"], icd10Codes: ["F41.1", "G47.00"], billedCents: 22000, paidCents: 14400, patientRespCents: 3500, status: "paid", denialCategory: null },
];

const SCOPES: ResearchScope[] = ["billing-only", "billing-and-outcomes", "full-clinical"];
const DIMENSIONS = ["age", "sex", "race", "ethnicity", "payer", "icd10", "cpt"] as const;

type Dimension = (typeof DIMENSIONS)[number];

export default function ResearchExportBuilderPage({
  searchParams,
}: {
  searchParams: {
    scope?: string;
    minCell?: string;
    from?: string;
    to?: string;
    payer?: string;
    sex?: string;
    dims?: string;
  };
}) {
  const scope: ResearchScope = (SCOPES as readonly string[]).includes(
    searchParams.scope ?? ""
  )
    ? (searchParams.scope as ResearchScope)
    : "billing-and-outcomes";
  const minCellSize = Math.max(1, parseInt(searchParams.minCell ?? "2", 10) || 2);
  const fromDate = searchParams.from ? new Date(searchParams.from) : new Date("2026-01-01");
  const toDate = searchParams.to ? new Date(searchParams.to) : new Date("2026-12-31");
  const payerFilter = searchParams.payer?.toLowerCase() ?? "";
  const sexFilter = searchParams.sex ?? "";
  const selectedDims = new Set<Dimension>(
    (searchParams.dims?.split(",") ?? ["age", "sex", "payer"]).filter((d): d is Dimension =>
      (DIMENSIONS as readonly string[]).includes(d),
    ),
  );

  const pseudo = new CohortPseudonymizer(BUILDER_SALT);

  const dateFilteredClaims = RAW_CLAIMS.filter(
    (c) => c.serviceDate >= fromDate && c.serviceDate <= toDate,
  );
  const payerFilteredClaims = payerFilter
    ? dateFilteredClaims.filter((c) =>
        categorizePayer(c.payerName).includes(payerFilter),
      )
    : dateFilteredClaims;

  const claimPatientIds = new Set(payerFilteredClaims.map((c) => c.patientId));
  const filteredPatients = RAW_PATIENTS.filter((p) => {
    if (!claimPatientIds.has(p.patientId)) return false;
    if (sexFilter && p.sex !== sexFilter) return false;
    return true;
  });

  const deIdentifiedPatients = filteredPatients.map((p) => deIdentifyPatient(p, pseudo));
  const deIdentifiedClaims = payerFilteredClaims.map((c) => deIdentifyClaim(c, pseudo));

  const { kept, suppressedBuckets } = suppressSmallCells(deIdentifiedPatients, minCellSize);
  const keptIds = new Set(kept.map((p) => p.pseudonym));
  const finalClaims = deIdentifiedClaims.filter((c) => keptIds.has(c.patientPseudonym));

  const manifest = buildCohortManifest({
    cohortId: `builder_${Date.now().toString(36).slice(-6)}`,
    scope,
    patientCount: kept.length,
    claimCount: finalClaims.length,
    minCellSize,
  });

  const totalBilledCents = finalClaims.reduce((acc, c) => acc + c.billedCents, 0);
  const totalPaidCents = finalClaims.reduce((acc, c) => acc + c.paidCents, 0);
  const collectionsRate =
    totalBilledCents > 0 ? ((totalPaidCents / totalBilledCents) * 100).toFixed(1) : "0.0";

  const payerMix = finalClaims.reduce<Record<string, number>>((acc, c) => {
    acc[c.payerCategory] = (acc[c.payerCategory] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Research portal"
        title="Export builder"
        description="Compose a de-identified research export. Pick scope, dimensions, filters, and small-cell threshold; preview the resulting cohort and manifest before queuing the export."
      />

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>1 · Configure</CardTitle>
          <CardDescription>
            All fields persist in the URL. Share the link with a colleague to reproduce the same cohort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/ops/research-exports/builder" method="get" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Research scope</span>
              <select
                name="scope"
                defaultValue={scope}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Min cell size</span>
              <input
                type="number"
                name="minCell"
                defaultValue={String(minCellSize)}
                min={1}
                max={20}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Sex filter (optional)</span>
              <select
                name="sex"
                defaultValue={sexFilter}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Service date — from</span>
              <input
                type="date"
                name="from"
                defaultValue={fromDate.toISOString().slice(0, 10)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Service date — to</span>
              <input
                type="date"
                name="to"
                defaultValue={toDate.toISOString().slice(0, 10)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Payer category</span>
              <input
                type="text"
                name="payer"
                defaultValue={payerFilter}
                placeholder="medicare, medicaid, commercial, self_pay…"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>

            <fieldset className="md:col-span-3">
              <legend className="text-xs text-text-muted mb-2">Dimensions to keep</legend>
              <div className="flex flex-wrap gap-3">
                {DIMENSIONS.map((d) => (
                  <label key={d} className="inline-flex items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      name="dims"
                      value={d}
                      defaultChecked={selectedDims.has(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-text-subtle mt-2">
                Multiple checkboxes share the same name. Submit serializes as `dims=age&dims=sex&…`; the
                builder reads them as a comma list under the hood.
              </p>
            </fieldset>

            <div className="md:col-span-3 flex gap-3">
              <button
                type="submit"
                className="rounded-md bg-text px-4 py-2 text-sm text-surface hover:opacity-90"
              >
                Preview cohort
              </button>
              <button
                type="reset"
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-text hover:bg-surface-muted"
              >
                Reset form
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Patients" value={String(kept.length)} size="md" />
        <StatCard label="Claims" value={String(finalClaims.length)} tone="accent" size="md" />
        <StatCard
          label="Suppressed"
          value={String(suppressedBuckets.length)}
          tone={suppressedBuckets.length > 0 ? "warning" : "success"}
          hint={suppressedBuckets.join(", ") || "none"}
          size="md"
        />
        <StatCard
          label="Collections"
          value={`${collectionsRate}%`}
          tone="info"
          size="md"
          hint={`$${(totalPaidCents / 100).toFixed(2)} / $${(totalBilledCents / 100).toFixed(2)}`}
        />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>2 · Manifest preview</CardTitle>
          <CardDescription>
            Ships with the export. Researchers see this as proof of de-identification rigor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-surface-muted rounded-md p-3 overflow-x-auto">
            {JSON.stringify(
              {
                ...manifest,
                dimensions: [...selectedDims],
                filters: {
                  scope,
                  sex: sexFilter || null,
                  payer: payerFilter || null,
                  from: fromDate.toISOString().slice(0, 10),
                  to: toDate.toISOString().slice(0, 10),
                },
              },
              null,
              2,
            )}
          </pre>
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(payerMix).map(([cat, count]) => (
              <Badge key={cat} tone="accent">
                {cat}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>3 · Cohort preview</CardTitle>
          <CardDescription>
            First {kept.length} patient rows with selected dimensions. Submit the export from the
            Researcher exports page once the preview looks right.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kept.length === 0 ? (
            <EmptyState
              title="No patients in this cohort"
              description="Loosen filters or lower the small-cell threshold."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3 text-text-subtle">Pseudonym</th>
                    {selectedDims.has("age") && <th className="py-2 pr-3 text-text-subtle">Age</th>}
                    {selectedDims.has("sex") && <th className="py-2 pr-3 text-text-subtle">Sex</th>}
                    {selectedDims.has("race") && <th className="py-2 pr-3 text-text-subtle">Race</th>}
                    {selectedDims.has("ethnicity") && (
                      <th className="py-2 pr-3 text-text-subtle">Ethnicity</th>
                    )}
                    <th className="py-2 pr-3 text-text-subtle">ZIP3</th>
                    <th className="py-2 text-text-subtle">SES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {kept.map((p) => (
                    <tr key={p.pseudonym}>
                      <td className="py-2 pr-3 font-mono text-[11px]">
                        {p.pseudonym.slice(0, 14)}…
                      </td>
                      {selectedDims.has("age") && (
                        <td className="py-2 pr-3 tabular-nums">{p.ageYears}</td>
                      )}
                      {selectedDims.has("sex") && <td className="py-2 pr-3">{p.sex}</td>}
                      {selectedDims.has("race") && (
                        <td className="py-2 pr-3">{p.race ?? "—"}</td>
                      )}
                      {selectedDims.has("ethnicity") && (
                        <td className="py-2 pr-3">{p.ethnicity ?? "—"}</td>
                      )}
                      <td className="py-2 pr-3 tabular-nums">
                        {p.zipPrefix === "000" ? <Badge tone="warning">000</Badge> : p.zipPrefix}
                      </td>
                      <td className="py-2">{p.socioeconomicTier ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
