// EMR-080 — Cannabis education library: legislation tracker.
//
// Curated, US-state-level snapshot of medical and adult-use cannabis
// legality, plus federal scheduling. Lives in the clinic library so a
// physician can answer a patient's "is this legal here?" without
// leaving the chart.

import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeafSprig } from "@/components/ui/ornament";

export const metadata = { title: "Cannabis legislation" };

type LegalStatus = "legal" | "medical_only" | "decriminalized" | "cbd_only" | "illegal";

interface StateRow {
  abbr: string;
  name: string;
  medical: LegalStatus;
  adultUse: LegalStatus;
  reciprocity: boolean;
  // Year medical became legal (or null if not legal).
  medicalSince: number | null;
  notes: string;
}

const STATES: StateRow[] = [
  { abbr: "AL", name: "Alabama", medical: "medical_only", adultUse: "illegal", reciprocity: false, medicalSince: 2021, notes: "Limited program; smokable flower not allowed." },
  { abbr: "AK", name: "Alaska", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 1998, notes: "Adult-use since 2014." },
  { abbr: "AZ", name: "Arizona", medical: "legal", adultUse: "legal", reciprocity: true, medicalSince: 2010, notes: "Reciprocity for valid out-of-state cards." },
  { abbr: "AR", name: "Arkansas", medical: "legal", adultUse: "illegal", reciprocity: true, medicalSince: 2016, notes: "Visiting patient access via approved cards." },
  { abbr: "CA", name: "California", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 1996, notes: "First state to legalize medical." },
  { abbr: "CO", name: "Colorado", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2000, notes: "Adult-use since 2012." },
  { abbr: "CT", name: "Connecticut", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2012, notes: "Adult-use since 2021." },
  { abbr: "DE", name: "Delaware", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2011, notes: "Adult-use since 2023." },
  { abbr: "FL", name: "Florida", medical: "legal", adultUse: "decriminalized", reciprocity: false, medicalSince: 2016, notes: "Smokable flower allowed since 2019." },
  { abbr: "GA", name: "Georgia", medical: "cbd_only", adultUse: "illegal", reciprocity: false, medicalSince: 2015, notes: "Low-THC oil only (≤5% THC)." },
  { abbr: "HI", name: "Hawaii", medical: "legal", adultUse: "decriminalized", reciprocity: true, medicalSince: 2000, notes: "Out-of-state patient cards accepted." },
  { abbr: "ID", name: "Idaho", medical: "illegal", adultUse: "illegal", reciprocity: false, medicalSince: null, notes: "No medical or adult-use program." },
  { abbr: "IL", name: "Illinois", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2013, notes: "Adult-use since 2020." },
  { abbr: "IN", name: "Indiana", medical: "illegal", adultUse: "illegal", reciprocity: false, medicalSince: null, notes: "Low-THC CBD only via narrow exception." },
  { abbr: "MA", name: "Massachusetts", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2012, notes: "Adult-use since 2016." },
  { abbr: "MD", name: "Maryland", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2013, notes: "Adult-use since 2023." },
  { abbr: "MI", name: "Michigan", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2008, notes: "Adult-use since 2018." },
  { abbr: "MN", name: "Minnesota", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2014, notes: "Adult-use since 2023." },
  { abbr: "MO", name: "Missouri", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2018, notes: "Adult-use since 2022." },
  { abbr: "MT", name: "Montana", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2004, notes: "Adult-use since 2021." },
  { abbr: "NE", name: "Nebraska", medical: "illegal", adultUse: "decriminalized", reciprocity: false, medicalSince: null, notes: "Decriminalized small possession." },
  { abbr: "NV", name: "Nevada", medical: "legal", adultUse: "legal", reciprocity: true, medicalSince: 2000, notes: "Adult-use since 2017." },
  { abbr: "NJ", name: "New Jersey", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2010, notes: "Adult-use since 2022." },
  { abbr: "NM", name: "New Mexico", medical: "legal", adultUse: "legal", reciprocity: true, medicalSince: 2007, notes: "Adult-use since 2022." },
  { abbr: "NY", name: "New York", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2014, notes: "Adult-use since 2021." },
  { abbr: "OH", name: "Ohio", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2016, notes: "Adult-use since 2023." },
  { abbr: "OR", name: "Oregon", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 1998, notes: "Adult-use since 2014." },
  { abbr: "PA", name: "Pennsylvania", medical: "legal", adultUse: "illegal", reciprocity: false, medicalSince: 2016, notes: "No smokable flower; concentrates only." },
  { abbr: "RI", name: "Rhode Island", medical: "legal", adultUse: "legal", reciprocity: true, medicalSince: 2006, notes: "Adult-use since 2022." },
  { abbr: "TX", name: "Texas", medical: "cbd_only", adultUse: "illegal", reciprocity: false, medicalSince: 2015, notes: "Compassionate Use Program; low-THC only." },
  { abbr: "UT", name: "Utah", medical: "legal", adultUse: "illegal", reciprocity: true, medicalSince: 2018, notes: "Reciprocity available with state-issued letter." },
  { abbr: "VA", name: "Virginia", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2020, notes: "Adult-use possession legal; retail pending." },
  { abbr: "VT", name: "Vermont", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 2004, notes: "Adult-use since 2018." },
  { abbr: "WA", name: "Washington", medical: "legal", adultUse: "legal", reciprocity: false, medicalSince: 1998, notes: "Adult-use since 2012." },
  { abbr: "WV", name: "West Virginia", medical: "legal", adultUse: "illegal", reciprocity: false, medicalSince: 2017, notes: "Smokable flower not allowed." },
];

const STATUS_TONE: Record<LegalStatus, "success" | "info" | "neutral" | "warning" | "danger"> = {
  legal: "success",
  medical_only: "info",
  decriminalized: "neutral",
  cbd_only: "warning",
  illegal: "danger",
};

const STATUS_LABEL: Record<LegalStatus, string> = {
  legal: "legal",
  medical_only: "medical only",
  decriminalized: "decriminalized",
  cbd_only: "CBD only",
  illegal: "illegal",
};

const FEDERAL_TIMELINE = [
  { year: 1937, event: "Marihuana Tax Act — federal restrictions begin." },
  { year: 1970, event: "Controlled Substances Act schedules cannabis as Schedule I." },
  { year: 1996, event: "California passes Prop 215 — first state medical program." },
  { year: 2014, event: "Rohrabacher-Farr amendment blocks DOJ funds for state-medical interference." },
  { year: 2018, event: "Farm Bill removes hemp (<0.3% THC) from Schedule I." },
  { year: 2022, event: "Federal pardons for prior simple-possession offenses." },
  { year: 2024, event: "DEA proposes rescheduling cannabis from Schedule I to Schedule III." },
];

export default function LegislationPage({
  searchParams,
}: {
  searchParams: { state?: string; q?: string };
}) {
  const stateFilter = (searchParams.state ?? "").toUpperCase();
  const query = (searchParams.q ?? "").toLowerCase();
  const filtered = STATES.filter((s) => {
    if (stateFilter && s.abbr !== stateFilter) return false;
    if (query && !`${s.name} ${s.notes}`.toLowerCase().includes(query)) return false;
    return true;
  });

  const adultUseLegal = STATES.filter((s) => s.adultUse === "legal").length;
  const medicalLegal = STATES.filter((s) => s.medical === "legal").length;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Library"
        title="Cannabis legislation"
        description="State-by-state status, reciprocity flags, and the federal timeline. Curated for quick chart-side answers — not legal advice."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-surface-raised border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-text-subtle">Adult-use legal</p>
          <p className="font-display text-2xl text-text mt-1 tabular-nums">{adultUseLegal}</p>
          <p className="text-[10px] text-text-subtle mt-1">of {STATES.length} tracked states</p>
        </div>
        <div className="rounded-xl bg-surface-raised border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-text-subtle">Medical legal</p>
          <p className="font-display text-2xl text-text mt-1 tabular-nums">{medicalLegal}</p>
          <p className="text-[10px] text-text-subtle mt-1">includes adult-use states</p>
        </div>
        <div className="rounded-xl bg-surface-raised border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-text-subtle">Reciprocity</p>
          <p className="font-display text-2xl text-text mt-1 tabular-nums">
            {STATES.filter((s) => s.reciprocity).length}
          </p>
          <p className="text-[10px] text-text-subtle mt-1">accept out-of-state cards</p>
        </div>
        <div className="rounded-xl bg-surface-raised border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-text-subtle">Federal status</p>
          <p className="font-display text-lg text-text mt-1">Schedule I (proposed III)</p>
          <p className="text-[10px] text-text-subtle mt-1">DEA rule pending</p>
        </div>
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent/80" />
            By state
          </CardTitle>
          <CardDescription>Filter by abbreviation or search notes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/clinic/library/legislation" method="get" className="mb-4 flex gap-2 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">State (2-letter)</span>
              <input
                name="state"
                defaultValue={stateFilter}
                placeholder="CA"
                maxLength={2}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm w-24 uppercase"
              />
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-text-muted">Search notes</span>
              <input
                name="q"
                defaultValue={query}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-text px-4 py-2 text-sm text-surface hover:opacity-90"
            >
              Apply
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">State</th>
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Medical</th>
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Adult use</th>
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Reciprocity</th>
                  <th className="py-2 pr-3 text-text-subtle text-[11px] uppercase tracking-wider">Since</th>
                  <th className="py-2 text-text-subtle text-[11px] uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((s) => (
                  <tr key={s.abbr}>
                    <td className="py-2 pr-3">
                      <span className="font-mono text-xs text-text-subtle mr-1">{s.abbr}</span>{" "}
                      <span className="text-text">{s.name}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={STATUS_TONE[s.medical]}>{STATUS_LABEL[s.medical]}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={STATUS_TONE[s.adultUse]}>{STATUS_LABEL[s.adultUse]}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {s.reciprocity ? <Badge tone="success">yes</Badge> : <span className="text-text-subtle text-xs">no</span>}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-text-muted">
                      {s.medicalSince ?? "—"}
                    </td>
                    <td className="py-2 text-text-muted text-xs">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Federal timeline</CardTitle>
          <CardDescription>Key federal actions shaping the medical-cannabis landscape.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {FEDERAL_TIMELINE.map((row) => (
              <li key={row.year} className="flex gap-4 text-sm">
                <span className="font-mono text-text-subtle w-12 tabular-nums">{row.year}</span>
                <span className="text-text-muted">{row.event}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </PageShell>
  );
}
