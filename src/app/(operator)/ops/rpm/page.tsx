import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  evaluateRpmMonth,
  summarizeTrends,
  TRANSMISSION_DAYS_REQUIRED,
  type RpmReading,
  type ProviderReviewEvent,
  type RpmBillingPeriod,
} from "@/lib/billing/rpm";

export const metadata = { title: "Medicare RPM" };

const MONTH_START = new Date("2026-04-01T00:00:00Z");
const MONTH_END = new Date("2026-04-30T23:59:59Z");

// Sample fixture cohort — once device webhooks (Omron / Dexcom) are live
// these come from the integrations layer. The eligibility math is the
// same; only the data source changes.
const COHORT: Array<{
  patient: string;
  mrn: string;
  setupAlreadyBilled: boolean;
  readings: RpmReading[];
  reviews: ProviderReviewEvent[];
}> = [
  {
    patient: "Eleanor Park",
    mrn: "MRN-C0301",
    setupAlreadyBilled: true,
    readings: buildBpReadings("MRN-C0301", 22),
    reviews: [
      {
        patientId: "MRN-C0301",
        providerId: "prv_01",
        startedAt: new Date("2026-04-15T15:00:00Z"),
        endedAt: new Date("2026-04-15T15:25:00Z"),
        interactiveCommunication: true,
        signedAt: new Date("2026-04-15T15:30:00Z"),
        notes: "BP trending down on uptitrated lisinopril; reinforce DASH.",
      },
      {
        patientId: "MRN-C0301",
        providerId: "prv_01",
        startedAt: new Date("2026-04-22T09:00:00Z"),
        endedAt: new Date("2026-04-22T09:30:00Z"),
        interactiveCommunication: true,
        signedAt: new Date("2026-04-22T09:35:00Z"),
        notes: "Review of weekly readings; medication adherence confirmed.",
      },
    ],
  },
  {
    patient: "Marcus Doyle",
    mrn: "MRN-C0314",
    setupAlreadyBilled: false,
    readings: buildBpReadings("MRN-C0314", 12),
    reviews: [
      {
        patientId: "MRN-C0314",
        providerId: "prv_02",
        startedAt: new Date("2026-04-10T11:00:00Z"),
        endedAt: new Date("2026-04-10T11:18:00Z"),
        interactiveCommunication: true,
        signedAt: new Date("2026-04-10T11:20:00Z"),
        notes: "New device setup + education.",
      },
    ],
  },
];

export default function RpmPage() {
  const evaluations = COHORT.map((p) => {
    const period: RpmBillingPeriod = {
      monthStart: MONTH_START,
      monthEnd: MONTH_END,
      patientId: p.mrn,
      setupAlreadyBilled: p.setupAlreadyBilled,
    };
    const lines = evaluateRpmMonth({ period, readings: p.readings, reviews: p.reviews });
    const trends = summarizeTrends(p.readings);
    const distinctDays = new Set(
      p.readings.map((r) => r.measuredAt.toISOString().slice(0, 10)),
    ).size;
    const minutes = p.reviews
      .filter((r) => r.interactiveCommunication)
      .reduce(
        (sum, r) => sum + Math.round((r.endedAt.getTime() - r.startedAt.getTime()) / 60_000),
        0,
      );
    return { ...p, lines, trends, distinctDays, minutes };
  });

  const totalLines = evaluations.reduce((sum, e) => sum + e.lines.length, 0);
  const total99454 = evaluations.filter((e) => e.lines.some((l) => l.cpt === "99454")).length;
  const total99457 = evaluations.filter((e) => e.lines.some((l) => l.cpt === "99457")).length;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Remote monitoring"
        title="Medicare RPM"
        description="Monthly RPM billing preview — CPT 99453 / 99454 / 99457 / 99458 evaluated against device transmissions and provider time. Pure logic; safe to run before claim drop."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Patients in month" value={String(COHORT.length)} size="md" />
        <StatCard label="Total claim lines" value={String(totalLines)} tone="accent" size="md" />
        <StatCard label="Eligible 99454" value={String(total99454)} tone="success" size="md" />
        <StatCard label="Eligible 99457" value={String(total99457)} tone="success" size="md" />
      </div>

      <div className="space-y-4">
        {evaluations.map((e) => (
          <Card key={e.mrn} tone="raised">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    {e.patient}{" "}
                    <span className="text-text-subtle text-sm font-normal">· {e.mrn}</span>
                  </CardTitle>
                  <CardDescription>
                    {e.distinctDays} transmission days · {e.minutes} interactive minutes ·
                    {e.setupAlreadyBilled ? " setup already billed" : " setup pending"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {e.distinctDays >= TRANSMISSION_DAYS_REQUIRED ? (
                    <Badge tone="success">Transmissions met</Badge>
                  ) : (
                    <Badge tone="warning">
                      {TRANSMISSION_DAYS_REQUIRED - e.distinctDays} more days needed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-2">
                  Vital trends
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {e.trends.map((t) => (
                    <div key={t.metric} className="border border-border rounded-md px-3 py-2">
                      <div className="text-xs text-text-subtle capitalize">{t.metric}</div>
                      <div className="text-text font-medium tabular-nums">
                        {t.latest} {t.unit}{" "}
                        {t.delta !== null && (
                          <span
                            className={
                              t.direction === "up"
                                ? "text-[color:var(--warning)] text-xs"
                                : t.direction === "down"
                                  ? "text-success text-xs"
                                  : "text-text-subtle text-xs"
                            }
                          >
                            {t.delta > 0 ? "↑" : t.delta < 0 ? "↓" : "→"} {Math.abs(t.delta)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {e.lines.length === 0 ? (
                <p className="text-sm text-text-subtle">No CPT lines eligible this month.</p>
              ) : (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-2">
                    Eligible CPT lines
                  </div>
                  <ul className="space-y-2">
                    {e.lines.map((line, i) => (
                      <li
                        key={i}
                        className="border border-border rounded-md px-4 py-3 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-text">
                            CPT {line.cpt}{" "}
                            <span className="text-text-subtle">× {line.units}</span>
                          </div>
                          <div className="text-xs text-text-muted mt-1">{line.rationale}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

// Helper: synthesize daily BP readings for the preview cohort.
function buildBpReadings(mrn: string, days: number): RpmReading[] {
  const out: RpmReading[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(MONTH_START.getTime() + i * 86_400_000);
    out.push({
      patientId: mrn,
      deviceId: `omron-${mrn}`,
      category: "blood_pressure",
      measuredAt: date,
      receivedAt: date,
      values: {
        systolic: 128 + ((i * 3) % 14) - 7,
        diastolic: 82 + ((i * 5) % 10) - 5,
        pulse: 70 + ((i * 7) % 12) - 6,
      },
      units: { systolic: "mmHg", diastolic: "mmHg", pulse: "bpm" },
      source: "omron",
    });
  }
  return out;
}
