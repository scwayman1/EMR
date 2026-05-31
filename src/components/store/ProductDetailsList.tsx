import { Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import type { CuratedProductDetails, ProductDetailItem } from "@/lib/marketplace/product-details";
import { Eyebrow } from "@/components/ui/ornament";
import { cn } from "@/lib/utils/cn";

// EMR-307 — AI-curated Product Details list.
//
// Distinct from the narrative AI summary: a structured, scannable
// key/value list of the specifics that matter for THIS product. The
// fields are chosen server-side by `curatedDetailsFor*` based on the
// product category; this component just renders them.

function emphasisClasses(emphasis: ProductDetailItem["emphasis"]) {
  switch (emphasis) {
    case "trust":
      return { row: "border-accent/30 bg-accent-soft/40", icon: ShieldCheck, iconClass: "text-accent" };
    case "warning":
      return { row: "border-highlight/40 bg-highlight-soft/50", icon: AlertTriangle, iconClass: "text-[color:var(--highlight-hover)]" };
    default:
      return { row: "border-border bg-surface", icon: null, iconClass: "" };
  }
}

function DetailRow({ item }: { item: ProductDetailItem }) {
  const { row, icon: Icon, iconClass } = emphasisClasses(item.emphasis);
  return (
    <div className={cn("flex items-start justify-between gap-4 rounded-xl border px-3.5 py-2.5", row)}>
      <span className="flex items-center gap-2 text-[13px] font-medium text-text">
        {Icon && <Icon width={14} height={14} className={iconClass} />}
        {item.label}
      </span>
      <span className="text-right text-[13px] text-text-muted">{item.value}</span>
    </div>
  );
}

export function ProductDetailsList({
  details,
  className,
}: {
  details: CuratedProductDetails;
  className?: string;
}) {
  const { highlights, specs } = details;
  return (
    <section className={cn("rounded-2xl border border-border bg-surface-raised p-5 sm:p-6", className)}>
      <div className="flex items-center gap-2">
        <Eyebrow>Product details</Eyebrow>
        <span className="inline-flex items-center gap-1 text-[11px] text-text-subtle">
          <Sparkles width={12} height={12} className="text-accent" />
          AI-curated
        </span>
      </div>
      <p className="mt-2 text-[13px] text-text-subtle">
        Specifics our AI pulled from this product&apos;s structured record — what matters most for its category.
      </p>

      {highlights.length > 0 && (
        <div className="mt-4 space-y-2">
          {highlights.map((item) => (
            <DetailRow key={`h-${item.label}`} item={item} />
          ))}
        </div>
      )}

      {specs.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
            Specifications
          </p>
          <div className="space-y-2">
            {specs.map((item) => (
              <DetailRow key={`s-${item.label}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {highlights.length === 0 && specs.length === 0 && (
        <p className="mt-4 text-[13px] text-text-muted">No structured details available yet.</p>
      )}
    </section>
  );
}
