import { Check, Minus } from "lucide-react";
import {
  EMR_PRICING_COLUMNS,
  EMR_PRICING_COMPARISON,
  EMR_PRICING_DISCLAIMER,
  type CellValue,
} from "@/lib/marketing/emr-pricing-comparison";
import { Eyebrow } from "@/components/ui/ornament";
import { cn } from "@/lib/utils/cn";

// EMR-156 — Subscription pricing vs EPIC / Cerner / Practice Fusion.
// Renders a comparison matrix on the public pricing page, with our column
// highlighted.

function Cell({ value }: { value: CellValue | undefined }) {
  if (value === undefined) return <Minus width={15} height={15} className="mx-auto text-text-subtle" />;
  if (value === true) return <Check width={16} height={16} className="mx-auto text-accent" />;
  if (value === false) return <Minus width={15} height={15} className="mx-auto text-text-subtle" />;
  return <span className="text-[13px] text-text">{value}</span>;
}

export function EmrPricingComparison() {
  const cols = EMR_PRICING_COLUMNS;
  return (
    <section className="mx-auto max-w-[1280px] px-6 pb-20 lg:px-12">
      <div className="mb-8 text-center">
        <Eyebrow className="mb-3 justify-center">How we compare</Eyebrow>
        <h2 className="font-display text-3xl tracking-tight text-text md:text-4xl">
          Leafjourney vs. EPIC, Cerner & Practice Fusion
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] text-text-muted">
          The legacy EMRs price by six-figure quote or pad a &ldquo;free&rdquo; tier with ads. We charge one
          flat, published rate — and we&apos;re the only one built for cannabis medicine.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="bg-surface-muted">
              <th className="p-4 align-bottom" />
              {cols.map((c) => (
                <th
                  key={c.id}
                  className={cn(
                    "p-4 align-bottom text-center",
                    c.isUs && "bg-accent-soft/60",
                  )}
                >
                  <span className={cn("block font-display text-lg tracking-tight", c.isUs ? "text-accent" : "text-text")}>
                    {c.vendor}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-text-subtle">{c.positioning}</span>
                  <span className="mt-1.5 block text-[13px] font-medium text-text">{c.priceHeadline}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EMR_PRICING_COMPARISON.map((group) => (
              <GroupRows key={group.group} group={group.group} rows={group.rows} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-text-subtle">{EMR_PRICING_DISCLAIMER}</p>
    </section>
  );
}

function GroupRows({
  group,
  rows,
  cols,
}: {
  group: string;
  rows: { feature: string; values: Record<string, CellValue> }[];
  cols: typeof EMR_PRICING_COLUMNS;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={cols.length + 1}
          className="border-t border-border bg-surface px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle"
        >
          {group}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.feature} className="border-t border-border/70">
          <th className="p-4 text-[13.5px] font-normal text-text-muted">{row.feature}</th>
          {cols.map((c) => (
            <td key={c.id} className={cn("p-4 text-center", c.isUs && "bg-accent-soft/40")}>
              <Cell value={row.values[c.id]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
