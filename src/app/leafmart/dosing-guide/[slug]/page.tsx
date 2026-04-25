import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { LeafmartProductGrid } from "@/components/leafmart/LeafmartProductCard";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = DEMO_PRODUCTS.find((p) => p.slug === params.slug);
  if (!product) return { title: "Dosing guide" };
  return {
    title: `${product.name} — dosing guide`,
    description: `How to use ${product.name}: suggested dose, timing, what to expect.`,
  };
}

interface SectionDef {
  eyebrow: string;
  title: string;
  body: string;
  bg: string;
  deep: string;
}

function buildSections(format: string, dose: string): SectionDef[] {
  const isBeverage = format === "beverage";
  const isTopical = format === "topical" || format === "serum";
  const isTincture = format === "tincture";

  const suggested =
    isBeverage
      ? `Start with one ${dose} serving in the hour before bed. If effects are mild after 3 nights, try a second serving at the same time the following evening.`
      : isTincture
      ? `Start with 0.5ml (about half a dropper). Place under the tongue, hold 60 seconds, then swallow.`
      : isTopical
      ? `A pea-sized amount per area is plenty. Massage in for 30 seconds until fully absorbed.`
      : `Begin at the lowest serving size on the label. Reassess after 3 days before adjusting.`;

  const timing =
    isBeverage
      ? `Take 45–60 minutes before you want to be asleep. Effects build gently, so don't restack within an hour.`
      : isTincture
      ? `Sublingual onset is 15–30 minutes. Pick a consistent time each day for the first week so you can read the signal.`
      : isTopical
      ? `Apply to clean, dry skin. Reapply every 4–6 hours as needed. Avoid broken skin or eye area.`
      : `Stay consistent for the first week — same time, same amount — before judging.`;

  const expect =
    isBeverage
      ? `A soft, settled feeling within an hour. Not sedation — more like the room getting quieter. No grogginess in the morning is the goal.`
      : isTincture
      ? `A subtle calm at 20–30 minutes that lasts 3–4 hours. If you feel nothing the first time, that's normal — give it 3 sessions.`
      : isTopical
      ? `Localized warmth, then ease, within 10–20 minutes. This is targeted relief — it doesn't reach the bloodstream meaningfully.`
      : `Effects are usually subtle and cumulative. Track them so you can tell signal from noise.`;

  const adjust =
    isBeverage
      ? `If after 5 nights you don't notice anything, increase to a full second serving 30 minutes later. If you wake groggy, scale back.`
      : isTincture
      ? `Increase by 0.25ml at a time, no more than once every 3 days. Smaller, consistent doses usually beat larger occasional ones.`
      : isTopical
      ? `If a spot is unresponsive after 3 days of regular use, try applying after a warm shower so absorption improves.`
      : `Adjust one variable at a time. If you change dose and timing together, you won't know which one worked.`;

  return [
    { eyebrow: "01", title: "Suggested dose", body: suggested, bg: "var(--sage)", deep: "var(--leaf)" },
    { eyebrow: "02", title: "Timing", body: timing, bg: "var(--peach)", deep: "#9E5621" },
    { eyebrow: "03", title: "What to expect", body: expect, bg: "var(--butter)", deep: "#8A6A1F" },
    { eyebrow: "04", title: "When to adjust", body: adjust, bg: "var(--lilac)", deep: "#5C4972" },
  ];
}

export default function DosingGuidePage({ params }: { params: { slug: string } }) {
  const product = DEMO_PRODUCTS.find((p) => p.slug === params.slug);
  if (!product) notFound();

  const sections = buildSections(product.format, product.dose);
  const related = DEMO_PRODUCTS.filter((p) => p.slug !== params.slug).slice(0, 3);

  return (
    <>
      {/* Breadcrumb */}
      <div className="px-6 lg:px-14 pt-6 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Link href="/leafmart" className="hover:text-[var(--leaf)]">Leafmart</Link>
          <span>·</span>
          <Link href={`/leafmart/products/${product.slug}`} className="hover:text-[var(--leaf)]">
            {product.name}
          </Link>
          <span>·</span>
          <span className="text-[var(--text)]">Dosing guide</span>
        </div>
      </div>

      {/* HERO */}
      <section className="px-6 lg:px-14 py-10 max-w-[1440px] mx-auto">
        <div
          className="rounded-[32px] grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-center overflow-hidden"
          style={{ background: product.bg }}
        >
          <div className="flex justify-center py-4 lg:py-0">
            <ProductSilhouette
              shape={product.shape}
              bg={product.bg}
              deep={product.deep}
              height={360}
              big
            />
          </div>
          <div className="px-8 lg:px-12 py-10 lg:py-14">
            <p className="eyebrow mb-3" style={{ color: product.deep }}>
              Dosing guide · {product.formatLabel}
            </p>
            <h1 className="font-display text-[40px] sm:text-[52px] lg:text-[60px] leading-[1.02] font-normal tracking-[-1.6px] text-[var(--ink)] mb-4">
              How to use
              <br />
              <em className="font-accent not-italic">{product.name}.</em>
            </h1>
            <p className="text-[16px] text-[var(--text-soft)] leading-relaxed max-w-[480px] mb-6">
              {product.support}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="trust-chip">{product.dose}</span>
              <span className="trust-chip">Lab verified</span>
              {product.tag && <span className="trust-chip">{product.tag}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="px-6 lg:px-14 pb-14 max-w-[1440px] mx-auto">
        <div className="max-w-[640px] mb-8">
          <p className="eyebrow text-[var(--muted)] mb-3">How to use this product</p>
          <h2 className="font-display text-[30px] sm:text-[38px] font-normal tracking-[-1px] leading-[1.05] text-[var(--ink)]">
            Start small, stay
            <em className="font-accent not-italic text-[var(--leaf)]"> consistent.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sections.map((s) => (
            <article
              key={s.title}
              className="rounded-[24px] p-7 flex flex-col gap-3"
              style={{ background: s.bg }}
            >
              <p className="font-mono text-[12px]" style={{ color: s.deep }}>
                {s.eyebrow}
              </p>
              <h3 className="font-display text-[24px] leading-tight text-[var(--ink)]">
                {s.title}
              </h3>
              <p className="text-[15px] text-[var(--text-soft)] leading-relaxed">
                {s.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* LOG OUTCOME CTA */}
      <section className="px-6 lg:px-14 pb-14 max-w-[1440px] mx-auto">
        <div
          className="rounded-[28px] p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center"
          style={{ background: "var(--leaf-soft)" }}
        >
          <div>
            <p className="eyebrow mb-3" style={{ color: "var(--leaf)" }}>
              After a few uses
            </p>
            <h3 className="font-display text-[26px] sm:text-[32px] font-normal tracking-[-0.8px] leading-[1.1] text-[var(--ink)] mb-2">
              How&rsquo;s it working for you?
            </h3>
            <p className="text-[15px] text-[var(--text-soft)] max-w-[520px] leading-relaxed">
              30 seconds of feedback helps you spot patterns — and helps the
              next person on the shelf decide.
            </p>
          </div>
          <Link
            href="/leafmart/account/outcomes"
            className="inline-flex items-center justify-center rounded-full font-medium tracking-wide bg-[var(--leaf)] text-[#FFF8E8] hover:bg-[var(--ink)] transition-colors whitespace-nowrap"
            style={{ padding: "16px 32px", fontSize: 15 }}
          >
            Log your outcome
          </Link>
        </div>
      </section>

      {/* RELATED */}
      <section className="px-6 lg:px-14 pb-20 max-w-[1440px] mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <p className="eyebrow text-[var(--muted)]">Related products</p>
          <Link
            href="/leafmart/products"
            className="text-[13px] font-medium text-[var(--leaf)] hover:underline"
          >
            Browse all →
          </Link>
        </div>
        <LeafmartProductGrid products={related} />
      </section>
    </>
  );
}
