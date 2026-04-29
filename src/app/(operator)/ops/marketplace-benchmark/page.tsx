// EMR-303 — internal report: how Theleafmart's storefront compares to
// Amazon. Scopes the next round of marketplace work and lets PMs share
// a single screen with leadership.

import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BENCHMARK_FEATURES,
  categoryScores,
  gapAreas,
  overallParity,
  type BenchmarkFeature,
} from "@/lib/marketplace/benchmark";

export const metadata = { title: "Marketplace Benchmark" };

const STATUS_TONE: Record<BenchmarkFeature["theleafmartStatus"], string> = {
  shipped: "bg-leaf-soft text-leaf-ink",
  partial: "bg-amber-100 text-amber-800",
  missing: "bg-rose-100 text-rose-800",
};

const CATEGORY_LABEL: Record<BenchmarkFeature["category"], string> = {
  discovery: "Discovery",
  pdp: "Product detail page",
  checkout: "Checkout",
  post_purchase: "Post-purchase",
  trust: "Trust",
  vendor: "Vendor portal",
  personalization: "Personalization",
};

export default async function MarketplaceBenchmarkPage() {
  await requireUser();

  const parity = overallParity();
  const scores = categoryScores().sort((a, b) => a.parityScore - b.parityScore);
  const gaps = gapAreas();

  return (
    <PageShell>
      <PageHeader
        eyebrow="EMR-303"
        title="Marketplace benchmark"
        description="How the Theleafmart storefront stacks up against Amazon, by category. Driven by the BENCHMARK_FEATURES matrix in src/lib/marketplace/benchmark.ts."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Overall parity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl tabular-nums">
              {(parity * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-text-muted mt-1">
              Shipped + half-credit for partial, across {BENCHMARK_FEATURES.length}{" "}
              tracked features.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl tabular-nums">{gaps.length}</div>
            <p className="text-sm text-text-muted mt-1">
              {gaps.filter((g) => g.priority === "P0").length} P0 ·{" "}
              {gaps.filter((g) => g.priority === "P1").length} P1 ·{" "}
              {gaps.filter((g) => g.priority === "P2").length} P2
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weakest category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl">
              {scores[0] ? CATEGORY_LABEL[scores[0].category] : "—"}
            </div>
            <p className="text-sm text-text-muted mt-1">
              {scores[0]
                ? `${(scores[0].parityScore * 100).toFixed(0)}% parity — start here`
                : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Parity by category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scores.map((s) => (
              <div key={s.category} className="flex items-center gap-3">
                <span className="text-sm w-44 shrink-0">
                  {CATEGORY_LABEL[s.category]}
                </span>
                <div className="flex-1 h-2 rounded-full bg-border/50 overflow-hidden">
                  <div
                    className="h-full bg-leaf"
                    style={{ width: `${s.parityScore * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted w-32 text-right tabular-nums">
                  {s.shipped} shipped · {s.partial} partial · {s.missing} missing
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-text-muted border-b border-border">
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Amazon reference</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARK_FEATURES.map((f) => (
                  <tr key={f.id} className="border-b border-border/50 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-text">{f.name}</div>
                      {f.notes && (
                        <div className="text-xs text-text-muted mt-1">{f.notes}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-text-muted">
                      {CATEGORY_LABEL[f.category]}
                    </td>
                    <td className="py-3 pr-4 text-text-muted">{f.amazonReference}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_TONE[f.theleafmartStatus]}`}
                      >
                        {f.theleafmartStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge>{f.priority}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{f.ticket ?? "—"}</td>
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
