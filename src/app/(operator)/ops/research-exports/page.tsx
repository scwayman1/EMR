import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "@/lib/billing/research-export";

export const metadata = { title: "Researcher Exports" };

// Stable salt for the demo cohort. In production each cohort manifest
// generates its own random salt and stores it next to the export.
const DEMO_SALT = "cohort_2026Q2_demo__salt_at_least_16_chars";

const RAW_PATIENTS: RawPatientFacts[] = [
  { patientId: "p1", dateOfBirth: new Date("1957-08-12"), sex: "female", race: "Black or African American", ethnicity: "Non-Hispanic", smokingStatus: "former", substanceHistory: null, zipCode: "80302", socioeconomicTier: "middle" },
  { patientId: "p2", dateOfBirth: new Date("1971-02-22"), sex: "male", race: "White", ethnicity: "Non-Hispanic", smokingStatus: "never", substanceHistory: "occasional alcohol", zipCode: "80303", socioeconomicTier: "middle" },
  { patientId: "p3", dateOfBirth: new Date("1986-11-30"), sex: "female", race: "Asian", ethnicity: "Non-Hispanic", smokingStatus: "never", substanceHistory: null, zipCode: "80305", socioeconomicTier: "upper" },
  { patientId: "p4", dateOfBirth: new Date("1992-04-04"), sex: "male", race: "White", ethnicity: "Hispanic", smokingStatus: "current", substanceHistory: "cannabis daily", zipCode: "80301", socioeconomicTier: "lower" },
  { patientId: "p5", dateOfBirth: new Date("1934-09-09"), sex: "female", race: "White", ethnicity: "Non-Hispanic", smokingStatus: "former", substanceHistory: null, zipCode: "03601", socioeconomicTier: "lower" }, // restricted ZIP3
];

const RAW_CLAIMS: RawClaimFacts[] = [
  { claimId: "c1", patientId: "p1", encounterId: "e1", serviceDate: new Date("2026-03-14"), payerName: "Medicare", cptCodes: ["99214", "99454"], icd10Codes: ["I10", "G89.4"], billedCents: 38000, paidCents: 26500, patientRespCents: 6000, status: "paid", denialCategory: null },
  { claimId: "c2", patientId: "p2", encounterId: "e2", serviceDate: new Date("2026-03-22"), payerName: "Aetna", cptCodes: ["99213"], icd10Codes: ["F41.1"], billedCents: 18500, paidCents: 11800, patientRespCents: 2900, status: "paid", denialCategory: null },
  { claimId: "c3", patientId: "p3", encounterId: "e3", serviceDate: new Date("2026-04-04"), payerName: "Self pay", cptCodes: ["99204"], icd10Codes: ["F12.10"], billedCents: 30000, paidCents: 30000, patientRespCents: 0, status: "paid", denialCategory: null },
  { claimId: "c4", patientId: "p4", encounterId: "e4", serviceDate: new Date("2026-04-12"), payerName: "Medicaid", cptCodes: ["99214"], icd10Codes: ["F12.10", "M54.5"], billedCents: 22000, paidCents: 0, patientRespCents: 0, status: "denied", denialCategory: "non_covered_service" },
  { claimId: "c5", patientId: "p5", encounterId: "e5", serviceDate: new Date("2026-04-22"), payerName: "Medicare", cptCodes: ["99457", "99458"], icd10Codes: ["I10"], billedCents: 14500, paidCents: 11200, patientRespCents: 0, status: "paid", denialCategory: null },
];

export default function ResearchExportsPage({
  searchParams,
}: {
  searchParams: { minCell?: string };
}) {
  const minCellSize = Math.max(1, parseInt(searchParams.minCell ?? "1", 10) || 1);
  const pseudo = new CohortPseudonymizer(DEMO_SALT);

  const deIdentifiedPatients = RAW_PATIENTS.map((p) => deIdentifyPatient(p, pseudo));
  const deIdentifiedClaims = RAW_CLAIMS.map((c) => deIdentifyClaim(c, pseudo));

  const { kept, suppressedBuckets } = suppressSmallCells(deIdentifiedPatients, minCellSize);
  const keptIds = new Set(kept.map((p) => p.pseudonym));
  const filteredClaims = deIdentifiedClaims.filter((c) => keptIds.has(c.patientPseudonym));

  const manifest = buildCohortManifest({
    cohortId: "demo_2026q2",
    scope: "billing-and-outcomes",
    patientCount: kept.length,
    claimCount: filteredClaims.length,
    minCellSize,
  });

  const payerMix = filteredClaims.reduce<Record<string, number>>((acc, c) => {
    acc[c.payerCategory] = (acc[c.payerCategory] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Research portal"
        title="Researcher exports"
        description="HIPAA Safe Harbor de-identification of billing + claim data for the researcher portal. Cohort-scoped pseudonyms, generalized geography, small-cell suppression."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Patients (post-suppression)" value={String(kept.length)} size="md" />
        <StatCard label="Claims" value={String(filteredClaims.length)} tone="accent" size="md" />
        <StatCard
          label="Suppressed buckets"
          value={String(suppressedBuckets.length)}
          tone={suppressedBuckets.length > 0 ? "warning" : "success"}
          hint={suppressedBuckets.join(", ") || "none"}
          size="md"
        />
        <StatCard label="Cohort id" value={manifest.cohortId} size="md" />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Cohort manifest</CardTitle>
          <CardDescription>
            Stored alongside the export. Researchers see this — it's their proof of de-identification rigor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-surface-muted rounded-md p-3 overflow-x-auto">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Patient cohort (de-identified)</CardTitle>
          <CardDescription>
            Direct identifiers dropped. Age capped at 89; ZIP generalized to first 3 digits with
            Safe Harbor restricted prefixes mapped to "000".
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kept.length === 0 ? (
            <EmptyState
              title="All buckets suppressed"
              description="Lower the minimum cell size to view the cohort."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3 text-text-subtle">Pseudonym</th>
                    <th className="py-2 pr-3 text-text-subtle">Age</th>
                    <th className="py-2 pr-3 text-text-subtle">Sex</th>
                    <th className="py-2 pr-3 text-text-subtle">Race</th>
                    <th className="py-2 pr-3 text-text-subtle">Ethnicity</th>
                    <th className="py-2 pr-3 text-text-subtle">Smoking</th>
                    <th className="py-2 pr-3 text-text-subtle">ZIP3</th>
                    <th className="py-2 text-text-subtle">SES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {kept.map((p) => (
                    <tr key={p.pseudonym}>
                      <td className="py-2 pr-3 font-mono text-[11px]">{p.pseudonym}</td>
                      <td className="py-2 pr-3 tabular-nums">{p.ageYears}</td>
                      <td className="py-2 pr-3">{p.sex}</td>
                      <td className="py-2 pr-3">{p.race}</td>
                      <td className="py-2 pr-3">{p.ethnicity}</td>
                      <td className="py-2 pr-3">{p.smokingStatus}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {p.zipPrefix === "000" ? <Badge tone="warning">000</Badge> : p.zipPrefix}
                      </td>
                      <td className="py-2">{p.socioeconomicTier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Claim cohort</CardTitle>
          <CardDescription>
            Service date generalized to month. Payer name → category. Sample of {filteredClaims.length} claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(payerMix).map(([cat, count]) => (
              <Badge
                key={cat}
                tone={categorizePayer(cat).startsWith("medic") ? "info" : "accent"}
              >
                {cat}: {count}
              </Badge>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-3 text-text-subtle">Claim</th>
                  <th className="py-2 pr-3 text-text-subtle">Patient</th>
                  <th className="py-2 pr-3 text-text-subtle">Month</th>
                  <th className="py-2 pr-3 text-text-subtle">Payer</th>
                  <th className="py-2 pr-3 text-text-subtle">CPTs</th>
                  <th className="py-2 pr-3 text-text-subtle">ICD-10</th>
                  <th className="py-2 pr-3 text-text-subtle text-right">Billed</th>
                  <th className="py-2 pr-3 text-text-subtle text-right">Paid</th>
                  <th className="py-2 text-text-subtle">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredClaims.map((c) => (
                  <tr key={c.claimPseudonym}>
                    <td className="py-2 pr-3 font-mono text-[11px]">{c.claimPseudonym.slice(0, 12)}…</td>
                    <td className="py-2 pr-3 font-mono text-[11px]">{c.patientPseudonym.slice(0, 12)}…</td>
                    <td className="py-2 pr-3 tabular-nums">{c.serviceMonth}</td>
                    <td className="py-2 pr-3">{c.payerCategory}</td>
                    <td className="py-2 pr-3">{c.cptCodes.join(", ")}</td>
                    <td className="py-2 pr-3">{c.icd10Codes.join(", ")}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">${(c.billedCents / 100).toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">${(c.paidCents / 100).toFixed(2)}</td>
                    <td className="py-2">
                      <Badge
                        tone={c.status === "paid" ? "success" : c.status === "denied" ? "danger" : "neutral"}
                      >
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
