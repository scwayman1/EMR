// EMR-315 — Vendor analytics dashboard.
//
// Surfaces revenue, orders, top-performing products, and traffic metrics.
// All math is computed in `lib/marketplace/vendor-analytics.ts` so the
// page stays a thin renderer; swapping demo aggregations for DB-backed
// ones is a one-line change in the loader.

import {
  demoSnapshot,
  defaultRange,
  formatCents,
  formatPercent,
  type VendorAnalyticsSnapshot,
} from "@/lib/marketplace/vendor-analytics";

export const metadata = { title: "Vendor analytics" };

export default async function VendorAnalyticsPage() {
  const range = defaultRange();
  const snapshot = demoSnapshot("demo-vendor", range);

  return (
    <main className="px-6 lg:px-12 py-10 max-w-[1200px] mx-auto">
      <header className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow text-[var(--leaf)] mb-2">Vendor portal</p>
          <h1 className="font-display text-3xl tracking-tight text-[var(--ink)]">
            Analytics
          </h1>
          <p className="text-[var(--text-soft)] mt-2 max-w-2xl">
            Revenue, orders, and traffic for your products on Leafmart.
          </p>
        </div>
        <p className="text-[12.5px] text-[var(--muted)]">
          {range.start} — {range.end}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Tile
          label="Gross revenue"
          value={formatCents(snapshot.revenue.grossCents)}
          sub={`Net ${formatCents(snapshot.revenue.netCents)} after take rate`}
        />
        <Tile
          label="Orders"
          value={snapshot.orders.count.toLocaleString()}
          sub={`${formatCents(snapshot.orders.averageOrderValueCents)} AOV`}
        />
        <Tile
          label="Refund rate"
          value={formatPercent(snapshot.orders.refundRate)}
          sub={`${snapshot.orders.refundCount} refunds`}
        />
      </section>

      <section className="rounded-xl border border-[var(--border)] p-6 mb-8">
        <p className="eyebrow text-[var(--muted)] mb-3">Daily revenue (last 30 days)</p>
        <Sparkline values={snapshot.revenue.daily} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Tile
          label="PDP views"
          value={snapshot.traffic.pdpViews.toLocaleString()}
        />
        <Tile
          label="Cart adds"
          value={snapshot.traffic.cartAdds.toLocaleString()}
        />
        <Tile
          label="Conversion"
          value={formatPercent(snapshot.traffic.conversionRate, 2)}
          sub="Orders / PDP views"
        />
      </section>

      <section>
        <h2 className="font-display text-lg text-[var(--ink)] mb-4">
          Top products
        </h2>
        <TopProductsTable rows={snapshot.topProducts} />
      </section>
    </main>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-[11.5px] uppercase text-[var(--muted)] tracking-wide mb-1">
        {label}
      </p>
      <p className="font-display text-3xl text-[var(--ink)] tabular-nums">
        {value}
      </p>
      {sub && <p className="text-[12.5px] text-[var(--muted)] mt-1">{sub}</p>}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 600;
  const height = 80;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const step = width / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / Math.max(1, max - min)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-20"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-[var(--leaf)]"
      />
    </svg>
  );
}

function TopProductsTable({
  rows,
}: {
  rows: VendorAnalyticsSnapshot["topProducts"];
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="bg-[var(--surface-muted)] text-left text-[11.5px] uppercase text-[var(--muted)]">
            <th className="py-3 px-4 font-medium">Product</th>
            <th className="py-3 px-4 font-medium text-right">Units sold</th>
            <th className="py-3 px-4 font-medium text-right">Gross</th>
            <th className="py-3 px-4 font-medium text-right">Reviews</th>
            <th className="py-3 px-4 font-medium text-right">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <tr key={r.productSlug}>
              <td className="py-3 px-4 font-medium text-[var(--ink)]">
                {r.productName}
              </td>
              <td className="py-3 px-4 text-right tabular-nums">{r.unitsSold}</td>
              <td className="py-3 px-4 text-right tabular-nums">
                {formatCents(r.grossCents)}
              </td>
              <td className="py-3 px-4 text-right tabular-nums">
                {r.reviewCount.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right tabular-nums">
                {r.averageRating.toFixed(1)} / 5
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
