"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";
import { AccountSidebar } from "@/components/leafmart/AccountSidebar";
import {
  DEMO_ORDERS,
  DEMO_OUTCOMES,
  type OutcomeEntry,
  formatDate,
  uniqueOrderedProductSlugs,
} from "@/components/leafmart/AccountData";

function StarPicker({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} of 5`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(value === n ? 0 : n)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "var(--highlight)" : "none"} stroke={filled ? "var(--highlight)" : "var(--border-strong)"} strokeWidth="1.6" strokeLinejoin="round">
              <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.4l-6.1 3.6 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function StarsStatic({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = rating >= n;
        return (
          <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={filled ? "var(--highlight)" : "none"} stroke={filled ? "var(--highlight)" : "var(--border-strong)"} strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.4l-6.1 3.6 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" />
          </svg>
        );
      })}
    </div>
  );
}

export default function OutcomesPage() {
  const orderedSlugs = useMemo(() => uniqueOrderedProductSlugs(DEMO_ORDERS), []);
  const orderedProducts = orderedSlugs
    .map((slug) => DEMO_PRODUCTS.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const [outcomes, setOutcomes] = useState<OutcomeEntry[]>(DEMO_OUTCOMES);
  const [drafts, setDrafts] = useState<Record<string, { rating: number; note: string }>>({});

  const draftFor = (slug: string) => drafts[slug] ?? { rating: 0, note: "" };
  const updateDraft = (slug: string, patch: Partial<{ rating: number; note: string }>) => {
    setDrafts((d) => ({ ...d, [slug]: { ...draftFor(slug), ...patch } }));
  };

  const submit = (slug: string) => {
    const d = draftFor(slug);
    if (d.rating === 0) return;
    const entry: OutcomeEntry = {
      id: `o-${Date.now()}`,
      productSlug: slug,
      date: new Date().toISOString().slice(0, 10),
      rating: d.rating,
      note: d.note.trim() || undefined,
    };
    setOutcomes((prev) => [entry, ...prev]);
    setDrafts((prev) => ({ ...prev, [slug]: { rating: 0, note: "" } }));
  };

  const timeline = [...outcomes].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="px-6 lg:px-14 pt-10 pb-20 max-w-[1440px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-6">
        <Link href="/leafmart" className="hover:text-[var(--leaf)]">Leafmart</Link>
        <span>·</span>
        <Link href="/leafmart/account" className="hover:text-[var(--leaf)]">Account</Link>
        <span>·</span>
        <span className="text-[var(--text)]">Outcomes</span>
      </div>

      <div className="mb-6">
        <p className="eyebrow text-[var(--muted)] mb-3">Outcomes</p>
        <h1 className="font-display text-[40px] sm:text-[52px] font-normal tracking-[-1.5px] leading-[1.05] text-[var(--ink)]">
          How&rsquo;s it
          <em className="font-accent not-italic text-[var(--leaf)]"> working?</em>
        </h1>
        <p className="text-[16px] text-[var(--text-soft)] max-w-[560px] mt-4 leading-relaxed">
          A 30-second check-in after a few uses. Your outcomes help others on
          the shelf — and inform the clinician desk reviewing each product.
        </p>
      </div>

      {/* Trust message */}
      <div
        className="rounded-[18px] p-4 flex items-center gap-3 mb-10 max-w-[640px]"
        style={{ background: "var(--leaf-soft)", color: "var(--leaf)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 9.4l2.4 2.4 4.6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-[13.5px] font-medium">
          Your outcomes help others on the shelf. We share aggregated, de-identified results.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside>
          <AccountSidebar />
        </aside>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-10">
          {/* Logger cards */}
          <div className="space-y-5">
            <p className="eyebrow text-[var(--muted)]">Products you&rsquo;ve tried</p>
            {orderedProducts.map((product) => {
              const d = draftFor(product.slug);
              return (
                <article
                  key={product.slug}
                  className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
                >
                  <div className="grid grid-cols-[112px_1fr] sm:grid-cols-[140px_1fr]">
                    <div className="flex-shrink-0">
                      <ProductSilhouette
                        shape={product.shape}
                        bg={product.bg}
                        deep={product.deep}
                        height={180}
                      />
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col gap-4">
                      <div>
                        <p className="eyebrow text-[var(--muted)] mb-1">{product.partner}</p>
                        <h3 className="font-display text-[22px] leading-tight text-[var(--ink)]">
                          {product.name}
                        </h3>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[12.5px] font-medium text-[var(--text-soft)]">
                          How&rsquo;s it working?
                        </label>
                        <StarPicker
                          value={d.rating}
                          onChange={(v) => updateDraft(product.slug, { rating: v })}
                        />
                      </div>

                      <textarea
                        value={d.note}
                        onChange={(e) => updateDraft(product.slug, { note: e.target.value })}
                        placeholder="Optional — what stood out? Timing, dose, anything you noticed."
                        rows={2}
                        className="w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--leaf)]"
                      />

                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/leafmart/dosing-guide/${product.slug}`}
                          className="text-[13px] text-[var(--leaf)] hover:underline"
                        >
                          Dosing guide →
                        </Link>
                        <button
                          type="button"
                          onClick={() => submit(product.slug)}
                          disabled={d.rating === 0}
                          className="inline-flex items-center rounded-full font-medium tracking-wide bg-[var(--leaf)] text-[var(--bg)] hover:bg-[var(--ink)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ padding: "10px 20px", fontSize: 13.5 }}
                        >
                          Log outcome
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Timeline */}
          <div>
            <p className="eyebrow text-[var(--muted)] mb-4">Your timeline</p>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
              {timeline.length === 0 ? (
                <p className="text-[14px] text-[var(--text-soft)]">No outcomes logged yet.</p>
              ) : (
                <ol className="relative space-y-5">
                  <span
                    aria-hidden
                    className="absolute left-[5px] top-2 bottom-2 w-px"
                    style={{ background: "var(--border)" }}
                  />
                  {timeline.map((entry) => {
                    const product = DEMO_PRODUCTS.find((p) => p.slug === entry.productSlug);
                    return (
                      <li key={entry.id} className="relative pl-7">
                        <span
                          aria-hidden
                          className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-[var(--bg)]"
                          style={{ background: "var(--leaf)" }}
                        />
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <p className="text-[14px] font-medium text-[var(--ink)] truncate">
                            {product?.name ?? entry.productSlug}
                          </p>
                          <p className="text-[12px] text-[var(--muted)] whitespace-nowrap">
                            {formatDate(entry.date)}
                          </p>
                        </div>
                        <div className="mb-1.5">
                          <StarsStatic rating={entry.rating} />
                        </div>
                        {entry.note && (
                          <p className="text-[13px] text-[var(--text-soft)] leading-relaxed">
                            &ldquo;{entry.note}&rdquo;
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
