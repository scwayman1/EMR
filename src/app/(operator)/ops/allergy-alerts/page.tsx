import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  summarizeAlerts,
  requiresStopInterstitial,
  type AllergyRecord,
  type ContraindicationRecord,
  type ChartAlert,
} from "@/lib/billing/allergy-alerts";

export const metadata = { title: "Allergies + Contraindications" };

const TONE_BADGE: Record<ChartAlert["tone"], "danger" | "warning" | "highlight" | "info"> = {
  danger: "danger",
  warning: "warning",
  caution: "highlight",
  info: "info",
};

// Sample fixtures — wires to prisma.patient + prisma.medicationAllergy
// in the next iteration once the contraindication source-of-truth model
// lands. Page validates the banner sort + interstitial logic today.
const FIXTURES: Array<{
  patient: string;
  mrn: string;
  allergies: AllergyRecord[];
  contraindications: ContraindicationRecord[];
}> = [
  {
    patient: "Maya Castillo",
    mrn: "MRN-A0042",
    allergies: [
      {
        id: "a1",
        substance: "Penicillin",
        reaction: "Anaphylaxis at age 12",
        severity: "fatal",
        recordedAt: new Date("2024-02-08"),
        selfReported: false,
      },
      {
        id: "a2",
        substance: "Sulfa",
        reaction: "Hives + facial swelling",
        severity: "severe",
        recordedAt: new Date("2025-09-14"),
        selfReported: true,
      },
    ],
    contraindications: [
      {
        id: "c1",
        trigger: "CBD + Atorvastatin",
        description:
          "CBD inhibits CYP3A4 — atorvastatin levels can rise to myopathy-risk range.",
        severity: "major",
        source: "drug-cannabis",
        recordedAt: new Date("2025-11-02"),
      },
    ],
  },
  {
    patient: "Jonas Reiter",
    mrn: "MRN-B0119",
    allergies: [],
    contraindications: [
      {
        id: "c2",
        trigger: "THC + Pregabalin",
        description:
          "Additive CNS depression — increased risk of falls and cognitive impairment.",
        severity: "moderate",
        source: "drug-cannabis",
        recordedAt: new Date("2026-01-12"),
      },
      {
        id: "c3",
        trigger: "Grapefruit juice",
        description: "CYP3A4 inhibition; clinically meaningful with current statin regimen.",
        severity: "monitor",
        source: "drug-condition",
        recordedAt: new Date("2025-08-20"),
      },
    ],
  },
];

export default function AllergyAlertsPage() {
  const summaries = FIXTURES.map((p) => ({
    ...p,
    alerts: summarizeAlerts(p.allergies, p.contraindications),
  }));

  const totalAlerts = summaries.reduce((acc, p) => acc + p.alerts.length, 0);
  const totalStop = summaries.filter((p) => requiresStopInterstitial(p.alerts)).length;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Patient safety"
        title="Allergies + contraindications"
        description="Top-of-chart alert payloads. Same logic powers the chart banner, the prescribe-modal block, and the prior-auth packet builder — single source of truth."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Patients in view" value={String(FIXTURES.length)} size="md" />
        <StatCard label="Active alerts" value={String(totalAlerts)} tone="warning" size="md" />
        <StatCard
          label="STOP interstitials"
          value={String(totalStop)}
          tone="danger"
          hint="Non-dismissible"
          size="md"
        />
        <StatCard
          label="Avg per chart"
          value={summaries.length === 0 ? "—" : (totalAlerts / summaries.length).toFixed(1)}
          size="md"
        />
      </div>

      <div className="space-y-4">
        {summaries.map((p) => (
          <Card key={p.mrn} tone="raised">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{p.patient}</CardTitle>
                  <CardDescription>MRN {p.mrn}</CardDescription>
                </div>
                {requiresStopInterstitial(p.alerts) && (
                  <Badge tone="danger">STOP interstitial active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {p.alerts.length === 0 ? (
                <p className="text-sm text-text-subtle">No active alerts on file.</p>
              ) : (
                <ul className="space-y-2">
                  {p.alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className="border border-border rounded-md px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-text">{alert.headline}</div>
                        <div className="text-xs text-text-muted mt-1">{alert.detail}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge tone={TONE_BADGE[alert.tone]}>{alert.kind}</Badge>
                        <span className="text-[11px] text-text-subtle">prio {alert.priority}</span>
                        {!alert.dismissible && <Badge tone="danger">locked</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
