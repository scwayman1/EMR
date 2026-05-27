import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AXIS_LABELS,
  COMPARATOR_TABLE,
  rankedVendors,
  vendorScore,
  type Mark,
  type Vendor,
} from "@/lib/platform/pricing-comparison";

export const metadata = { title: "Pricing comparator" };

const MARK_GLYPH: Record<Mark, string> = {
  yes: "✓",
  partial: "◐",
  no: "—",
  addon: "+",
};

const MARK_TONE: Record<
  Mark,
  "success" | "highlight" | "neutral" | "info"
> = {
  yes: "success",
  partial: "highlight",
  no: "neutral",
  addon: "info",
};

function fmtUsd(n: number | null): string {
  if (n == null) return "Quote";
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export default async function PlatformPricingPage() {
  await requireUser();
  const vendors = rankedVendors();
  const vendorIds = vendors.map((v) => v.id);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Platform · EMR-156"
        title="Pricing comparator"
        description="Subscription pricing benchmarked against EPIC, Cerner, Practice Fusion, athenaOne and Elation. List prices only — competitor contracts vary."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {vendors.slice(0, 3).map((v) => (
          <Card
            key={v.id}
            tone={v.id === "leafjourney" ? "raised" : "default"}
            className={v.id === "leafjourney" ? "ring-1 ring-accent/40" : ""}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{v.displayName}</CardTitle>
                  <CardDescription>{v.tagline}</CardDescription>
                </div>
                <Badge tone={v.id === "leafjourney" ? "accent" : "neutral"}>
                  {vendorScore(v.id).toFixed(0)} pts
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-subtle">Monthly / provider</dt>
                  <dd className="font-mono">{fmtUsd(v.monthlyPerProvider)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-subtle">Implementation</dt>
                  <dd className="font-mono">{fmtUsd(v.implementationFee)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-subtle">Time to live</dt>
                  <dd className="font-mono">{v.timeToLiveWeeks} wks</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-subtle">3-year TCO</dt>
                  <dd className="font-mono">{fmtUsd(v.threeYearTcoSmallClinic)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Feature axis comparison</CardTitle>
          <CardDescription>
            Yes (✓) · Partial (◐) · Add-on (+) · Not offered (—). Hover the cell for the source note.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-subtle text-[11px] uppercase tracking-wide">
                  <th className="py-2 pr-4">Feature</th>
                  {vendors.map((v) => (
                    <th key={v.id} className="py-2 px-2 text-center">
                      {v.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARATOR_TABLE.map((row) => (
                  <tr key={row.axis} className="border-t border-border/60">
                    <td className="py-3 pr-4 text-text">{AXIS_LABELS[row.axis]}</td>
                    {vendorIds.map((vid) => {
                      const cell = row.marks[vid as Vendor];
                      return (
                        <td
                          key={vid}
                          className="py-3 px-2 text-center"
                          title={cell.note ?? ""}
                        >
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                              MARK_TONE[cell.mark] === "success"
                                ? "bg-accent-soft text-accent"
                                : MARK_TONE[cell.mark] === "highlight"
                                  ? "bg-highlight-soft text-[color:var(--highlight-hover)]"
                                  : MARK_TONE[cell.mark] === "info"
                                    ? "bg-blue-50 text-info"
                                    : "bg-surface-muted text-text-muted"
                            }`}
                          >
                            {MARK_GLYPH[cell.mark]}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sources</CardTitle>
          <CardDescription>
            We never quote a competitor's negotiated contract. Citations below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-[12px] text-text-muted">
            {vendors.map((v) => (
              <li key={v.id}>
                <span className="font-medium text-text">{v.displayName}:</span>{" "}
                {v.citation}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}
