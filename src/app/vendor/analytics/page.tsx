import Link from "next/link";
import { TrendingUp, TrendingDown, PackageCheck, Truck } from "lucide-react";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { Sparkline } from "@/components/ui/sparkline";
import { Eyebrow } from "@/components/ui/ornament";
import { Badge } from "@/components/ui/badge";
import { formatCents, formatPercent } from "@/lib/marketplace/vendor-analytics";
import {
  buildComparativeReport,
  RANGE_PRESETS,
  isPreset,
  type RangePreset,
  type MetricDelta,
} from "@/lib/store/vendor-reporting";
import { cn } from "@/lib/utils/cn";

const VENDOR_ID = "solace-botanicals";

function deltaLabel(d: MetricDelta): string {
  const sign = d.deltaPct >= 0 ? "+" : "";
  return `${sign}${formatPercent(d.deltaPct)} YoY`;
}

function DeltaPill({ d }: { d: MetricDelta }) {
  const up = d.deltaPct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <Badge tone={up ? "success" : "danger"}>
      <Icon width={11} height={11} />
      {up ? "+" : ""}
      {formatPercent(d.deltaPct)}
    </Badge>
  );
}

export default function VendorAnalyticsPage({
  searchParams,
}: {
  searchParams?: { preset?: string };
}) {
  const preset: RangePreset = isPreset(searchParams?.preset) ? searchParams!.preset : "month";
  const report = buildComparativeReport(VENDOR_ID, preset);
  const { current, prior, deltas } = report;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Vendor analytics"
        title="Orders & revenue"
        description="Filter by period and compare against the same period one year earlier. All figures update with the range you pick."
      />

      {/* Range preset tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {RANGE_PRESETS.map((r) => {
          const active = r.preset === preset;
          return (
            <Link
              key={r.preset}
              href={`/vendor/analytics?preset=${r.preset}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-border bg-surface text-text-muted hover:border-accent hover:text-text",
              )}
              aria-current={active ? "page" : undefined}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      <p className="mb-5 text-[12.5px] text-text-subtle">
        Showing {current.range.start} → {current.range.end} · compared to {prior.range.start} → {prior.range.end}
      </p>

      {/* KPI tiles */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Gross revenue"
          value={formatCents(current.snapshot.revenue.grossCents)}
          delta={deltaLabel(deltas.grossRevenue)}
          accent="forest"
          trend={current.snapshot.revenue.daily}
        />
        <MetricTile
          label="Net revenue"
          value={formatCents(current.snapshot.revenue.netCents)}
          delta={deltaLabel(deltas.netRevenue)}
        />
        <MetricTile
          label="Orders"
          value={current.snapshot.orders.count.toLocaleString()}
          delta={deltaLabel(deltas.orders)}
        />
        <MetricTile
          label="Avg. order value"
          value={formatCents(current.snapshot.orders.averageOrderValueCents)}
          delta={deltaLabel(deltas.averageOrderValue)}
          accent="amber"
        />
      </div>

      {/* Year-over-year comparison */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <Eyebrow>Year over year</Eyebrow>
          <CardTitle>{report.presetLabel} vs. the same period last year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Gross revenue", current: formatCents(current.snapshot.revenue.grossCents), prior: formatCents(prior.snapshot.revenue.grossCents), d: deltas.grossRevenue },
              { label: "Net revenue", current: formatCents(current.snapshot.revenue.netCents), prior: formatCents(prior.snapshot.revenue.netCents), d: deltas.netRevenue },
              { label: "Orders", current: current.snapshot.orders.count.toLocaleString(), prior: prior.snapshot.orders.count.toLocaleString(), d: deltas.orders },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-text-subtle">
                    {row.label}
                  </p>
                  <DeltaPill d={row.d} />
                </div>
                <p className="mt-2 font-display text-2xl tabular-nums text-text">{row.current}</p>
                <p className="mt-0.5 text-[12.5px] text-text-subtle">
                  was {row.prior} last year
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fulfillment */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card tone="raised">
          <CardHeader>
            <Eyebrow>Fulfillment</Eyebrow>
            <CardTitle>Orders filled & delivered</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <span className="flex items-center gap-2 text-[14px] text-text">
                <PackageCheck width={16} height={16} className="text-accent" /> Filled
              </span>
              <span className="flex items-center gap-2">
                <span className="font-display text-lg tabular-nums text-text">
                  {current.fulfillment.ordersFilled.toLocaleString()}
                </span>
                <DeltaPill d={deltas.ordersFilled} />
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <span className="flex items-center gap-2 text-[14px] text-text">
                <Truck width={16} height={16} className="text-accent" /> Delivered
              </span>
              <span className="flex items-center gap-2">
                <span className="font-display text-lg tabular-nums text-text">
                  {current.fulfillment.ordersDelivered.toLocaleString()}
                </span>
                <DeltaPill d={deltas.ordersDelivered} />
              </span>
            </div>
            <p className="text-[12.5px] text-text-subtle">
              {current.fulfillment.inTransit.toLocaleString()} in transit ·{" "}
              {formatPercent(current.fulfillment.deliveryRate)} delivery rate
            </p>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <Eyebrow>Daily revenue</Eyebrow>
            <CardTitle>Trend across the period</CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline data={current.snapshot.revenue.daily} width={640} height={140} className="w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card tone="raised">
        <CardHeader>
          <Eyebrow>Catalog</Eyebrow>
          <CardTitle>Top products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-subtle">
                  <th className="py-2 pr-4 font-medium">Product</th>
                  <th className="py-2 pr-4 text-right font-medium">Units</th>
                  <th className="py-2 pr-4 text-right font-medium">Gross</th>
                  <th className="py-2 text-right font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {current.snapshot.topProducts.map((p) => (
                  <tr key={p.productSlug}>
                    <td className="py-2.5 pr-4 text-text">{p.productName}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-text-muted">
                      {p.unitsSold.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-text">
                      {formatCents(p.grossCents)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-text-muted">
                      {p.averageRating.toFixed(1)} ({p.reviewCount})
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
