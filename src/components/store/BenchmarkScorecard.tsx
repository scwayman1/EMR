import { Check, Clock, CircleDashed } from "lucide-react";
import { AMAZON_BENCHMARK, benchmarkScore, type BenchmarkStatus } from "@/lib/store/benchmark";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";

// EMR-303 — "Rival Amazon" scorecard. Honest read on how the storefront
// stacks up against the Amazon-grade bar, dimension by dimension.

const STATUS_META: Record<BenchmarkStatus, { label: string; tone: React.ComponentProps<typeof Badge>["tone"]; icon: typeof Check }> = {
  shipped: { label: "Shipped", tone: "success", icon: Check },
  in_progress: { label: "In progress", tone: "warning", icon: Clock },
  planned: { label: "Planned", tone: "neutral", icon: CircleDashed },
};

export function BenchmarkScorecard() {
  const { shipped, total, pct } = benchmarkScore();
  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>The Amazon bar</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl tracking-tight text-text">
            How we rival the Amazon experience
          </h2>
          <p className="mt-1 max-w-xl text-[13.5px] text-text-muted">
            Theleafmart is the &ldquo;Amazon of cannabis.&rdquo; Every storefront decision is graded
            against what a shopper gets on Amazon — here&apos;s the honest scorecard.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl tabular-nums text-text">{pct}%</p>
          <p className="text-[12px] text-text-subtle">
            {shipped} of {total} dimensions shipped
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {AMAZON_BENCHMARK.map((d) => {
          const meta = STATUS_META[d.status];
          const Icon = meta.icon;
          return (
            <li key={d.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-text">{d.capability}</p>
                <Badge tone={meta.tone}>
                  <Icon width={11} height={11} /> {meta.label}
                </Badge>
              </div>
              <p className="mt-1.5 text-[12px] text-text-subtle">
                <span className="font-medium text-text-muted">Amazon bar:</span> {d.amazonBar}
              </p>
              <p className="mt-1 text-[12.5px] text-text-muted">{d.leafmartMove}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
