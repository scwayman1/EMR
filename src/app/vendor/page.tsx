import Link from "next/link";
import { BarChart3, FileText, ArrowRight } from "lucide-react";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { buildComparativeReport } from "@/lib/store/vendor-reporting";
import { formatCents, formatPercent } from "@/lib/marketplace/vendor-analytics";

// EMR-315 — Vendor portal overview. A glanceable snapshot plus entry points
// into analytics and tax documents.

const VENDOR_ID = "solace-botanicals";

function deltaLabel(deltaPct: number): string {
  const sign = deltaPct >= 0 ? "+" : "";
  return `${sign}${formatPercent(deltaPct)} YoY`;
}

export default function VendorOverviewPage() {
  const report = buildComparativeReport(VENDOR_ID, "month");
  const { current, deltas } = report;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Vendor portal"
        title="Welcome back, Solace Botanicals"
        description="Your marketplace performance at a glance. Dive into analytics or pull your tax documents."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Gross revenue (30d)"
          value={formatCents(current.snapshot.revenue.grossCents)}
          delta={deltaLabel(deltas.grossRevenue.deltaPct)}
          accent="forest"
          trend={current.snapshot.revenue.daily}
        />
        <MetricTile
          label="Net revenue (30d)"
          value={formatCents(current.snapshot.revenue.netCents)}
          delta={deltaLabel(deltas.netRevenue.deltaPct)}
        />
        <MetricTile
          label="Orders filled"
          value={current.fulfillment.ordersFilled.toLocaleString()}
          delta={deltaLabel(deltas.ordersFilled.deltaPct)}
        />
        <MetricTile
          label="Orders delivered"
          value={current.fulfillment.ordersDelivered.toLocaleString()}
          delta={deltaLabel(deltas.ordersDelivered.deltaPct)}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/vendor/analytics" className="group">
          <Card tone="raised" className="h-full transition-shadow hover:shadow-xl">
            <CardContent className="pt-6">
              <BarChart3 width={24} height={24} className="text-accent" />
              <h2 className="mt-3 font-display text-xl tracking-tight text-text">Analytics</h2>
              <p className="mt-1.5 text-[14px] text-text-muted">
                Filter orders and revenue by day, week, month, quarter, or year — and compare against
                the same period last year.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                Open analytics <ArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/tax-documents" className="group">
          <Card tone="raised" className="h-full transition-shadow hover:shadow-xl">
            <CardContent className="pt-6">
              <FileText width={24} height={24} className="text-accent" />
              <h2 className="mt-3 font-display text-xl tracking-tight text-text">Tax documents</h2>
              <p className="mt-1.5 text-[14px] text-text-muted">
                Download marketplace 1099-K and settlement statements, plus W-2 / W-3 and quarterly
                941s for your employees and your business.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                Open tax documents <ArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </PageShell>
  );
}
